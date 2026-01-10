/**
 * Audit Logging Utilities for Edge Functions
 * 
 * Provides structured audit logging for privileged actions with automatic
 * data sanitization to prevent sensitive information leakage.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeLogObject } from "./safe-logging.ts";

// Audit action categories
export type AuditAction =
  // Role & Permission actions
  | "role.create"
  | "role.update"
  | "role.delete"
  | "role.revoke"
  | "role.restore"
  | "permission.update"
  | "permission.menu_update"
  | "permission.branch_update"
  // Subscription & Payment actions
  | "subscription.create"
  | "subscription.update"
  | "subscription.cancel"
  | "subscription.payment_success"
  | "subscription.payment_failed"
  | "sms_credits.purchase"
  | "sms_credits.deduct"
  // Member actions
  | "member.create"
  | "member.update"
  | "member.delete"
  | "member.approve"
  | "member.reject"
  | "member.pin_reset"
  // Auth actions
  | "auth.login_success"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_reset"
  | "auth.otp_requested"
  | "auth.otp_verified"
  | "auth.rate_limited"
  // Tenant actions
  | "church.settings_update"
  | "branch.create"
  | "branch.update"
  | "branch.delete"
  // Service actions
  | "service.create"
  | "service.update"
  | "service.delete"
  // SMS Campaign actions
  | "sms.campaign_create"
  | "sms.campaign_send"
  // Other
  | "security.alert_acknowledged"
  | "data.export"
  | string; // Allow custom actions

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditLogEntry {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  churchId: string;
  branchId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  outcome?: AuditOutcome;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Mask an IP address for privacy (keep first two octets)
 */
function maskIpAddress(ip: string | null): string | null {
  if (!ip) return null;
  
  // IPv4
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.xxx.xxx`;
  }
  
  // IPv6 - just show prefix
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx`;
    }
  }
  
  return "xxx.xxx.xxx.xxx";
}

/**
 * Extract client info from request headers
 */
function extractClientInfo(req?: Request): { ipAddress: string | null; userAgent: string | null } {
  if (!req) {
    return { ipAddress: null, userAgent: null };
  }
  
  // Common proxy headers for real IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             req.headers.get("x-real-ip") ||
             req.headers.get("cf-connecting-ip");
  
  const userAgent = req.headers.get("user-agent");
  
  return {
    ipAddress: maskIpAddress(ip),
    userAgent: userAgent ? userAgent.substring(0, 200) : null, // Truncate long UAs
  };
}

/**
 * Create an audit log entry
 * Uses service role to bypass RLS (audit logs are write-protected from clients)
 */
export async function createAuditLog(
  entry: AuditLogEntry,
  req?: Request
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Audit logging: Missing Supabase credentials");
      return { success: false, error: "Configuration error" };
    }
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract client info from request
    const clientInfo = extractClientInfo(req);
    
    // Sanitize metadata to prevent sensitive data leakage
    const sanitizedMetadata = entry.metadata 
      ? sanitizeLogObject(entry.metadata) as Record<string, unknown>
      : {};
    
    const { error } = await adminClient
      .from("audit_logs")
      .insert({
        actor_id: entry.actorId || null,
        actor_email: entry.actorEmail || null,
        actor_role: entry.actorRole || null,
        church_id: entry.churchId,
        branch_id: entry.branchId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        target_user_id: entry.targetUserId || null,
        metadata: sanitizedMetadata,
        outcome: entry.outcome || "success",
        error_message: entry.errorMessage || null,
        ip_address: entry.ipAddress || clientInfo.ipAddress,
        user_agent: entry.userAgent || clientInfo.userAgent,
      });
    
    if (error) {
      console.error("Audit logging failed:", error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error("Audit logging exception:", err);
    return { success: false, error: "Exception during logging" };
  }
}

/**
 * Create a security alert for suspicious activity
 */
export async function createSecurityAlert(
  alertType: string,
  severity: "low" | "medium" | "high" | "critical",
  description: string,
  options?: {
    churchId?: string;
    actorId?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Security alert: Missing Supabase credentials");
      return { success: false, error: "Configuration error" };
    }
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Sanitize metadata
    const sanitizedMetadata = options?.metadata 
      ? sanitizeLogObject(options.metadata) as Record<string, unknown>
      : {};
    
    const { error } = await adminClient
      .from("security_alerts")
      .insert({
        alert_type: alertType,
        severity,
        description,
        church_id: options?.churchId || null,
        actor_id: options?.actorId || null,
        ip_address: maskIpAddress(options?.ipAddress || null),
        metadata: sanitizedMetadata,
      });
    
    if (error) {
      console.error("Security alert creation failed:", error.message);
      return { success: false, error: error.message };
    }
    
    // Log to console for immediate visibility in function logs
    console.warn(`[SECURITY ALERT] ${severity.toUpperCase()}: ${alertType} - ${description}`);
    
    return { success: true };
  } catch (err) {
    console.error("Security alert exception:", err);
    return { success: false, error: "Exception during alert creation" };
  }
}

/**
 * Helper to log role change actions
 */
export async function logRoleChange(
  action: "role.create" | "role.update" | "role.delete" | "role.revoke" | "role.restore",
  actor: { id: string; email?: string; role?: string },
  target: { userId: string; roleId?: string; newRole?: string; oldRole?: string },
  churchId: string,
  outcome: AuditOutcome = "success",
  req?: Request
): Promise<void> {
  await createAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    churchId,
    action,
    resourceType: "user_role",
    resourceId: target.roleId,
    targetUserId: target.userId,
    metadata: {
      newRole: target.newRole,
      oldRole: target.oldRole,
    },
    outcome,
  }, req);
}

/**
 * Helper to log permission changes
 */
export async function logPermissionChange(
  action: "permission.update" | "permission.menu_update" | "permission.branch_update",
  actor: { id: string; email?: string; role?: string },
  target: { userId: string; roleId: string },
  churchId: string,
  changes: { added?: string[]; removed?: string[]; type?: string },
  outcome: AuditOutcome = "success",
  req?: Request
): Promise<void> {
  await createAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    churchId,
    action,
    resourceType: "permission",
    resourceId: target.roleId,
    targetUserId: target.userId,
    metadata: {
      permissionType: changes.type,
      added: changes.added,
      removed: changes.removed,
    },
    outcome,
  }, req);
}

/**
 * Helper to log subscription/payment changes
 */
export async function logSubscriptionChange(
  action: "subscription.create" | "subscription.update" | "subscription.payment_success" | "subscription.payment_failed",
  churchId: string,
  details: {
    subscriptionId?: string;
    planCode?: string;
    amount?: number;
    currency?: string;
    oldStatus?: string;
    newStatus?: string;
  },
  outcome: AuditOutcome = "success",
  req?: Request
): Promise<void> {
  await createAuditLog({
    churchId,
    action,
    resourceType: "subscription",
    resourceId: details.subscriptionId,
    metadata: {
      planCode: details.planCode,
      amount: details.amount,
      currency: details.currency,
      oldStatus: details.oldStatus,
      newStatus: details.newStatus,
    },
    outcome,
  }, req);
}

/**
 * Helper to log authentication events
 */
export async function logAuthEvent(
  action: "auth.login_success" | "auth.login_failed" | "auth.rate_limited" | "auth.otp_requested" | "auth.otp_verified",
  identifier: string, // email or masked identifier
  churchId?: string,
  outcome: AuditOutcome = "success",
  details?: { reason?: string; attempts?: number },
  req?: Request
): Promise<void> {
  // For auth events, we may not have a churchId - that's okay
  await createAuditLog({
    actorEmail: identifier.includes("@") ? identifier : undefined,
    churchId: churchId || "00000000-0000-0000-0000-000000000000", // System-level if no church
    action,
    resourceType: "auth",
    metadata: {
      reason: details?.reason,
      attempts: details?.attempts,
    },
    outcome,
  }, req);
}
