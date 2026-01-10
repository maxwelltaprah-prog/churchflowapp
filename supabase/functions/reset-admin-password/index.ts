import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorizeRequest, getServiceClient } from "../_shared/authorization.ts";
import { createAuditLog } from "../_shared/audit-logging.ts";
import { safeLog } from "../_shared/safe-logging.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Authorize the request - only church admins can reset passwords
    const authResult = await authorizeRequest(req, {
      requireRole: ["church_admin"],
    });

    if (!authResult.success || !authResult.user) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user } = authResult;

    // Parse request body
    const { targetUserId, newPassword } = await req.json();

    // Validate inputs
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Target user ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-reset through this endpoint
    if (targetUserId === user.userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot reset your own password through this endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = getServiceClient();

    // Verify target user belongs to the same church
    const { data: targetRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("id, user_id, church_id, role")
      .eq("user_id", targetUserId)
      .eq("church_id", user.churchId)
      .maybeSingle();

    if (roleError) {
      safeLog("Error checking target user role:", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify target user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetRole) {
      return new Response(
        JSON.stringify({ success: false, error: "Target user is not an admin of this church" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reset the password using admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      safeLog("Error resetting password:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to reset password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action for audit
    await createAuditLog({
      action: "auth.password_reset",
      resourceType: "user",
      resourceId: targetUserId,
      actorId: user.userId,
      actorEmail: user.email,
      actorRole: user.role,
      churchId: user.churchId,
      targetUserId: targetUserId,
      outcome: "success",
      metadata: {
        target_role: targetRole.role,
        reset_by: "superadmin",
      },
    }, req);

    safeLog("Password reset successful for target user");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    safeLog("Unexpected error in reset-admin-password:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
