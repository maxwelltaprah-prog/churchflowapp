import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting inactive member check...");

    // Get all churches
    const { data: churches, error: churchError } = await supabase
      .from("churches")
      .select("id");

    if (churchError) {
      console.error("Error fetching churches:", churchError);
      throw churchError;
    }

    let totalUpdated = 0;

    for (const church of churches || []) {
      console.log(`Processing church: ${church.id}`);

      // Get all branches for this church
      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id")
        .eq("church_id", church.id)
        .eq("is_active", true);

      if (branchError) {
        console.error(`Error fetching branches for church ${church.id}:`, branchError);
        continue;
      }

      for (const branch of branches || []) {
        // Get last 8 services for this branch, ordered by date descending
        const { data: services, error: servicesError } = await supabase
          .from("services")
          .select("id, service_date")
          .eq("branch_id", branch.id)
          .eq("is_active", true)
          .order("service_date", { ascending: false })
          .limit(8);

        if (servicesError) {
          console.error(`Error fetching services for branch ${branch.id}:`, servicesError);
          continue;
        }

        // Need at least 8 services to evaluate
        if (!services || services.length < 8) {
          console.log(`Branch ${branch.id} has less than 8 services, skipping`);
          continue;
        }

        const serviceIds = services.map(s => s.id);

        // Get all active members in this branch
        const { data: members, error: membersError } = await supabase
          .from("members")
          .select("id, full_name")
          .eq("branch_id", branch.id)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .eq("membership_status", "active");

        if (membersError) {
          console.error(`Error fetching members for branch ${branch.id}:`, membersError);
          continue;
        }

        if (!members || members.length === 0) {
          continue;
        }

        const memberIds = members.map(m => m.id);

        // Get attendance records for these members in the last 8 services
        const { data: attendance, error: attendanceError } = await supabase
          .from("attendance")
          .select("member_id, service_id")
          .in("service_id", serviceIds)
          .in("member_id", memberIds);

        if (attendanceError) {
          console.error(`Error fetching attendance for branch ${branch.id}:`, attendanceError);
          continue;
        }

        // Create a set of member IDs who attended at least one of the last 8 services
        const attendedMemberIds = new Set((attendance || []).map(a => a.member_id));

        // Find members who didn't attend ANY of the last 8 services
        const inactiveMembers = members.filter(m => !attendedMemberIds.has(m.id));

        if (inactiveMembers.length > 0) {
          console.log(`Found ${inactiveMembers.length} inactive members in branch ${branch.id}`);
          
          const inactiveMemberIds = inactiveMembers.map(m => m.id);

          // Update these members to inactive
          const { error: updateError, count } = await supabase
            .from("members")
            .update({ membership_status: "inactive" })
            .in("id", inactiveMemberIds);

          if (updateError) {
            console.error(`Error updating members to inactive:`, updateError);
          } else {
            console.log(`Updated ${inactiveMembers.length} members to inactive:`, 
              inactiveMembers.map(m => m.full_name).join(", "));
            totalUpdated += inactiveMembers.length;
          }
        }
      }
    }

    console.log(`Inactive member check complete. Total updated: ${totalUpdated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Checked all members. ${totalUpdated} members marked as inactive.` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-inactive-members:", error);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
