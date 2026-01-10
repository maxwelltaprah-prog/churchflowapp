import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getClientIdentifier, checkServerRateLimit, recordAttempt, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { secureJsonResponse, secureErrorResponse } from "../_shared/security-headers.ts";
import { addTimingJitter } from "../_shared/security.ts";
import { safeLog, safeError, getRequiredSecret } from "../_shared/safe-logging.ts";

interface VerifyPhoneRequest {
  phone: string;
  action: "login" | "create_pin";
}

// Normalize phone number for comparison
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length >= 12) {
    digits = "0" + digits.slice(3);
  }
  return digits;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Rate limiting for auth endpoints
    const ipIdentifier = getClientIdentifier(req);
    const rateLimit = checkServerRateLimit(ipIdentifier, "auth");
    if (!rateLimit.allowed) {
      await addTimingJitter();
      return rateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    recordAttempt(ipIdentifier, "auth");

    // SECURE: Fail fast if secrets are missing
    const supabaseUrl = getRequiredSecret("SUPABASE_URL");
    const supabaseServiceKey = getRequiredSecret("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, action }: VerifyPhoneRequest = await req.json();

    if (!phone || phone.length < 9) {
      return secureErrorResponse("Invalid phone number", corsHeaders, 400);
    }

    if (!action || !["login", "create_pin"].includes(action)) {
      return secureErrorResponse("Invalid action", corsHeaders, 400);
    }

    const normalizedInputPhone = normalizePhone(phone);

    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, phone, approval_status, user_id, is_active")
      .eq("is_active", true);

    if (memberError) {
      // SAFE: Log error without sensitive details
      safeError("Database query failed", { action });
      return secureErrorResponse("Database error", corsHeaders, 500);
    }

    const matchedMember = members?.find((m) => {
      const memberPhone = normalizePhone(m.phone || "");
      return memberPhone === normalizedInputPhone ||
        memberPhone.endsWith(normalizedInputPhone) ||
        normalizedInputPhone.endsWith(memberPhone);
    });

    // Add timing jitter to prevent enumeration
    await addTimingJitter();

    if (!matchedMember) {
      // SAFE: Log without phone number
      safeLog("Phone verification failed - no match", { action });
      return secureJsonResponse({ 
        success: false, 
        error: action === "login" ? "Invalid credentials" : "No member found with this phone number."
      }, corsHeaders, 404);
    }

    if (matchedMember.approval_status === "pending") {
      return secureJsonResponse({ success: false, error: "Membership pending approval", approval_status: "pending" }, corsHeaders, 403);
    }

    if (matchedMember.approval_status === "rejected") {
      return secureJsonResponse({ success: false, error: "Membership not approved", approval_status: "rejected" }, corsHeaders, 403);
    }

    const hasAccount = !!matchedMember.user_id;

    if (action === "login") {
      if (!hasAccount) {
        return secureJsonResponse({ success: false, error: "Please create your PIN first", has_account: false }, corsHeaders, 403);
      }
      return secureJsonResponse({ success: true, member_name: matchedMember.full_name, has_account: true, member_phone: matchedMember.phone }, corsHeaders);
    }

    if (action === "create_pin") {
      if (hasAccount) {
        return secureJsonResponse({ success: false, error: "Account already exists", has_account: true }, corsHeaders, 400);
      }
      return secureJsonResponse({ success: true, member_name: matchedMember.full_name, member_id: matchedMember.id, member_phone: matchedMember.phone, has_account: false }, corsHeaders);
    }

    return secureErrorResponse("Invalid action", corsHeaders, 400);
  } catch (error: any) {
    safeError("Phone verification error", error);
    return secureErrorResponse("Internal server error", corsHeaders, 500);
  }
});
