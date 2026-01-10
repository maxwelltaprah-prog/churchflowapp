import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getCorsHeaders, handleCorsPreflightRequest, isAllowedOrigin, getPublicCorsHeaders, handlePublicCorsPreflightRequest } from "../_shared/cors.ts";
import { getSecureHeaders, secureErrorResponse } from "../_shared/security-headers.ts";
import { checkServerRateLimit, recordAttempt, rateLimitResponse } from "../_shared/rate-limiting.ts";
import { sanitizePhone, validateUUID } from "../_shared/validation.ts";

interface CheckPhoneRequest {
  phone: string;
  church_id: string;
}

interface CheckPhoneResponse {
  exists: boolean;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getPublicCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handlePublicCorsPreflightRequest(req);
  }

  // Validate origin (if present)
  if (origin && !isAllowedOrigin(origin)) {
    return secureErrorResponse("Forbidden", corsHeaders, 403);
  }

  try {
    // Get client identifier for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Check rate limit (public endpoint - more restrictive)
    const rateLimitResult = checkServerRateLimit(clientIP, "public");
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 300, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => null);
    if (!body) {
      recordAttempt(clientIP, "public");
      return secureErrorResponse("Invalid request body", corsHeaders, 400);
    }

    const { phone, church_id }: CheckPhoneRequest = body;

    // Validate and sanitize inputs
    const sanitizedPhone = sanitizePhone(phone || "");
    if (!sanitizedPhone || sanitizedPhone.length < 9) {
      recordAttempt(clientIP, "public");
      return new Response(
        JSON.stringify({ exists: false, error: "Invalid phone number" } as CheckPhoneResponse),
        { status: 400, headers: getSecureHeaders(corsHeaders) }
      );
    }

    if (!church_id || !validateUUID(church_id)) {
      recordAttempt(clientIP, "public");
      return new Response(
        JSON.stringify({ exists: false, error: "Invalid church ID" } as CheckPhoneResponse),
        { status: 400, headers: getSecureHeaders(corsHeaders) }
      );
    }

    // Check if phone exists in this church (exact match only for registration)
    const { data: existingMember, error } = await supabase
      .from("members")
      .select("id")
      .eq("phone", sanitizedPhone)
      .eq("church_id", church_id)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      recordAttempt(clientIP, "public");
      return new Response(
        JSON.stringify({ exists: false, error: "Database error" } as CheckPhoneResponse),
        { status: 500, headers: getSecureHeaders(corsHeaders) }
      );
    }

    return new Response(
      JSON.stringify({ exists: !!existingMember } as CheckPhoneResponse),
      { status: 200, headers: getSecureHeaders(corsHeaders) }
    );
  } catch (error: any) {
    console.error("Error in check-phone-exists:", error);
    return secureErrorResponse("An unexpected error occurred", corsHeaders, 500);
  }
});
