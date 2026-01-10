import { getCorsHeaders } from "../_shared/cors.ts";
import { authorizeRequest, getServiceClient } from "../_shared/authorization.ts";
import { logRoleChange } from "../_shared/audit-logging.ts";
import { safeLog } from "../_shared/safe-logging.ts";

type AdminAccessAction = "revoke" | "restore" | "remove";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authResult = await authorizeRequest(req, {
      requireRole: ["church_admin"],
    });

    if (!authResult.success || !authResult.user) {
      return jsonResponse(
        { success: false, error: authResult.error || "Unauthorized" },
        authResult.status || 401,
        corsHeaders
      );
    }

    const actor = authResult.user;

    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as AdminAccessAction | undefined;
    const userRoleId = body?.userRoleId as string | undefined;

    if (!action || !["revoke", "restore", "remove"].includes(action)) {
      return jsonResponse(
        { success: false, error: "Invalid action" },
        400,
        corsHeaders
      );
    }

    if (!userRoleId || typeof userRoleId !== "string") {
      return jsonResponse(
        { success: false, error: "userRoleId is required" },
        400,
        corsHeaders
      );
    }

    const adminClient = getServiceClient();

    // Verify target role belongs to same church
    const { data: targetRole, error: targetError } = await adminClient
      .from("user_roles")
      .select("id, user_id, church_id, role, is_active")
      .eq("id", userRoleId)
      .maybeSingle();

    if (targetError) {
      safeLog("Error fetching target role", targetError);
      return jsonResponse(
        { success: false, error: "Failed to verify target admin" },
        500,
        corsHeaders
      );
    }

    if (!targetRole || targetRole.church_id !== actor.churchId) {
      // Don't leak whether it exists
      return jsonResponse(
        { success: false, error: "Access denied" },
        403,
        corsHeaders
      );
    }

    // Prevent self management
    if (targetRole.user_id === actor.userId) {
      return jsonResponse(
        { success: false, error: "You cannot modify your own admin access" },
        400,
        corsHeaders
      );
    }

    // Enforce "delete only after revoke" workflow
    if (action === "remove" && targetRole.is_active) {
      return jsonResponse(
        { success: false, error: "Revoke access first before removing permanently" },
        400,
        corsHeaders
      );
    }

    if (action === "revoke") {
      const { data: updated, error: updateError } = await adminClient
        .from("user_roles")
        .update({ is_active: false })
        .eq("id", userRoleId)
        .eq("church_id", actor.churchId)
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        safeLog("Error revoking admin access", updateError);
        await logRoleChange(
          "role.revoke",
          { id: actor.userId, email: actor.email, role: actor.role },
          { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: targetRole.role },
          actor.churchId,
          "failure",
          req
        );
        return jsonResponse(
          { success: false, error: "Failed to revoke access" },
          500,
          corsHeaders
        );
      }

      await logRoleChange(
        "role.revoke",
        { id: actor.userId, email: actor.email, role: actor.role },
        { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: targetRole.role },
        actor.churchId,
        "success",
        req
      );

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    if (action === "restore") {
      const { data: updated, error: updateError } = await adminClient
        .from("user_roles")
        .update({ is_active: true })
        .eq("id", userRoleId)
        .eq("church_id", actor.churchId)
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        safeLog("Error restoring admin access", updateError);
        await logRoleChange(
          "role.restore",
          { id: actor.userId, email: actor.email, role: actor.role },
          { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: targetRole.role },
          actor.churchId,
          "failure",
          req
        );
        return jsonResponse(
          { success: false, error: "Failed to restore access" },
          500,
          corsHeaders
        );
      }

      await logRoleChange(
        "role.restore",
        { id: actor.userId, email: actor.email, role: actor.role },
        { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: targetRole.role },
        actor.churchId,
        "success",
        req
      );

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    // remove
    const [menuDel, branchDel] = await Promise.all([
      adminClient.from("admin_menu_permissions").delete().eq("user_role_id", userRoleId),
      adminClient.from("admin_branch_permissions").delete().eq("user_role_id", userRoleId),
    ]);

    if (menuDel.error) safeLog("Error deleting menu permissions", menuDel.error);
    if (branchDel.error) safeLog("Error deleting branch permissions", branchDel.error);

    const { error: deleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("id", userRoleId)
      .eq("church_id", actor.churchId);

    if (deleteError) {
      safeLog("Error deleting user_role", deleteError);
      await logRoleChange(
        "role.delete",
        { id: actor.userId, email: actor.email, role: actor.role },
        { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: undefined },
        actor.churchId,
        "failure",
        req
      );
      return jsonResponse(
        { success: false, error: "Failed to remove administrator" },
        500,
        corsHeaders
      );
    }

    await logRoleChange(
      "role.delete",
      { id: actor.userId, email: actor.email, role: actor.role },
      { userId: targetRole.user_id, roleId: userRoleId, oldRole: targetRole.role, newRole: undefined },
      actor.churchId,
      "success",
      req
    );

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    safeLog("Unexpected error in manage-admin-access", error);
    return jsonResponse(
      { success: false, error: "Internal server error" },
      500,
      corsHeaders
    );
  }
});
