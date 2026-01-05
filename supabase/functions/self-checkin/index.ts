// Self check-in public function (no login required)
// Supports:
// - action: "get_service" (serviceId)
// - action: "checkin" (serviceId, memberCode) - memberCode is last 4 digits of phone
// - action: "get_downloads" (serviceId, memberId) - returns unexpired uploads (only if member checked in)
// - action: "get_download_url" (serviceId, memberId, uploadId) - returns a signed URL for download/open
// If multiple members match, returns disambiguation list

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "get_service" | "checkin" | "get_downloads" | "get_download_url";

interface MemberMatch {
  id: string;
  full_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE") ??
      "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing server env vars", {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(serviceRoleKey),
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => null);
    const action: Action | undefined = body?.action;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_service") {
      const serviceId: string | undefined = body?.serviceId;
      if (!serviceId) {
        return new Response(JSON.stringify({ error: "Missing serviceId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: service, error } = await supabase
        .from("services")
        .select("id, name, service_date, start_time, is_active, churches(name), branches(name)")
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("get_service error", error);
        return new Response(JSON.stringify({ error: "Failed to load service" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!service) {
        return new Response(JSON.stringify({ error: "Service not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ service }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "checkin") {
      const serviceId: string | undefined = body?.serviceId;
      const memberCodeRaw: string | undefined = body?.memberCode;
      const memberId: string | undefined = body?.memberId; // For disambiguation

      if (!serviceId || !memberCodeRaw) {
        return new Response(JSON.stringify({ error: "Missing serviceId or memberCode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const memberCode = memberCodeRaw.trim();

      // Validate memberCode is exactly 4 digits
      if (!/^\d{4}$/.test(memberCode)) {
        return new Response(JSON.stringify({ error: "Member code must be exactly 4 digits" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: service, error: serviceErr } = await supabase
        .from("services")
        .select("id, church_id, branch_id, is_active")
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();

      if (serviceErr) {
        console.error("service lookup error", serviceErr);
        return new Response(JSON.stringify({ error: "Failed to load service" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!service) {
        return new Response(JSON.stringify({ error: "Service not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let member = null;

      // If memberId is provided (disambiguation resolved), use it directly
      if (memberId) {
        const { data: memberById, error: memberByIdErr } = await supabase
          .from("members")
          .select("id, full_name, branch_id, is_active, approval_status")
          .eq("id", memberId)
          .eq("church_id", service.church_id)
          .maybeSingle();

        if (memberByIdErr) {
          console.error("member lookup by id error", memberByIdErr);
        }
        member = memberById;
      } else {
        // Find members whose phone ends with these 4 digits within this church
        const { data: matchingMembers, error: memberErr } = await supabase
          .from("members")
          .select("id, full_name, phone, branch_id, is_active, approval_status")
          .eq("church_id", service.church_id)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .like("phone", `%${memberCode}`);

        if (memberErr) {
          console.error("member lookup error", memberErr);
          return new Response(JSON.stringify({ error: "Failed to find member" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!matchingMembers || matchingMembers.length === 0) {
          return new Response(JSON.stringify({ error: "Member not found. Please check your code." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // If multiple members match, return disambiguation
        if (matchingMembers.length > 1) {
          const members: MemberMatch[] = matchingMembers.map(m => ({
            id: m.id,
            full_name: m.full_name,
          }));
          
          return new Response(
            JSON.stringify({ status: "disambiguation_required", members }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Single match
        member = matchingMembers[0];
      }

      if (!member) {
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!member.is_active) {
        return new Response(JSON.stringify({ error: "Membership is inactive" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (member.approval_status !== "approved") {
        return new Response(JSON.stringify({ error: "Membership is not approved" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Already checked in?
      const { data: existing, error: existingErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("service_id", service.id)
        .eq("member_id", member.id)
        .maybeSingle();

      if (existingErr) {
        console.error("existing check error", existingErr);
      }

      if (existing) {
        return new Response(
          JSON.stringify({ status: "already_checked_in", name: member.full_name, memberId: member.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const isCrossBranch = member.branch_id !== service.branch_id;

      const { error: insertErr } = await supabase.from("attendance").insert({
        church_id: service.church_id,
        branch_id: service.branch_id,
        service_id: service.id,
        member_id: member.id,
        checkin_method: "self_scan",
        is_cross_branch: isCrossBranch,
        member_home_branch_id: isCrossBranch ? member.branch_id : null,
      });

      if (insertErr) {
        console.error("insert attendance error", insertErr);
        // Duplicate (unique constraint) safety
        if (insertErr.code === "23505") {
          return new Response(
            JSON.stringify({ status: "already_checked_in", name: member.full_name, memberId: member.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ error: "Failed to check in" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ status: "checked_in", name: member.full_name, memberId: member.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "get_downloads") {
      const serviceId: string | undefined = body?.serviceId;
      const memberId: string | undefined = body?.memberId;

      if (!serviceId || !memberId) {
        return new Response(JSON.stringify({ error: "Missing serviceId or memberId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow downloads listing if the member actually checked into this service
      const { data: attendanceRow, error: attendanceErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("service_id", serviceId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (attendanceErr) {
        console.error("get_downloads attendance check error", attendanceErr);
        return new Response(JSON.stringify({ error: "Failed to validate check-in" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!attendanceRow) {
        return new Response(JSON.stringify({ error: "Not checked in" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { data: uploads, error: uploadsErr } = await supabase
        .from("service_uploads")
        .select("id, upload_type, file_name, file_type, file_size, storage_path, expires_at")
        .eq("service_id", serviceId)
        .eq("is_expired", false)
        .gt("expires_at", now);

      if (uploadsErr) {
        console.error("get_downloads error", uploadsErr);
        return new Response(JSON.stringify({ error: "Failed to load downloads" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ uploads: uploads || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_download_url") {
      const serviceId: string | undefined = body?.serviceId;
      const memberId: string | undefined = body?.memberId;
      const uploadId: string | undefined = body?.uploadId;

      if (!serviceId || !memberId || !uploadId) {
        return new Response(JSON.stringify({ error: "Missing serviceId, memberId, or uploadId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure member checked into this service
      const { data: attendanceRow, error: attendanceErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("service_id", serviceId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (attendanceErr) {
        console.error("get_download_url attendance check error", attendanceErr);
        return new Response(JSON.stringify({ error: "Failed to validate check-in" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!attendanceRow) {
        return new Response(JSON.stringify({ error: "Not checked in" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure upload exists and is still valid
      const now = new Date().toISOString();
      const { data: upload, error: uploadErr } = await supabase
        .from("service_uploads")
        .select("storage_path, expires_at, is_expired")
        .eq("id", uploadId)
        .eq("service_id", serviceId)
        .eq("is_expired", false)
        .gt("expires_at", now)
        .maybeSingle();

      if (uploadErr) {
        console.error("get_download_url upload lookup error", uploadErr);
        return new Response(JSON.stringify({ error: "Failed to load file" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!upload) {
        return new Response(JSON.stringify({ error: "File not available" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signed, error: signedErr } = await supabase.storage
        .from("service-uploads")
        .createSignedUrl(upload.storage_path, 3600);

      if (signedErr) {
        console.error("get_download_url signed url error", signedErr);
        return new Response(JSON.stringify({ error: "Failed to create download link" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ signedUrl: signed?.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("self-checkin function error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
