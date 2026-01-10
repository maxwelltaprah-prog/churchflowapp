/**
 * Shared authorization utilities for edge functions
 * Prevents IDOR/BOLA by deriving tenant context from authenticated user
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthorizedUser {
  userId: string;
  email: string | undefined;
  churchId: string;
  role: "church_admin" | "branch_admin" | "usher" | "member";
  branchId: string | null;
  accessibleBranchIds: string[];
}

export interface AuthorizationResult {
  success: boolean;
  user?: AuthorizedUser;
  error?: string;
  status?: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify authenticated user and derive their tenant context
 * This is the primary authorization function - use it to prevent IDOR/BOLA
 * 
 * @param req - The incoming request
 * @param options - Optional configuration
 * @returns AuthorizationResult with user context or error
 */
export async function authorizeRequest(
  req: Request,
  options?: {
    requireRole?: ("church_admin" | "branch_admin" | "usher" | "member")[];
    requireChurchId?: string; // Optionally verify against a specific church
  }
): Promise<AuthorizationResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { 
      success: false, 
      error: "Unauthorized - No valid authorization header", 
      status: 401 
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create client with user's token to verify authentication
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Verify the user is authenticated
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  
  if (authError || !user) {
    return { 
      success: false, 
      error: "Unauthorized - Invalid or expired token", 
      status: 401 
    };
  }

  // Use service role to fetch user's roles and profile (bypasses RLS safely)
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Get user's profile to find their church
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("church_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.church_id) {
    return { 
      success: false, 
      error: "Forbidden - User has no church association", 
      status: 403 
    };
  }

  // Get user's active roles
  const { data: roles, error: rolesError } = await adminClient
    .from("user_roles")
    .select("role, branch_id, church_id")
    .eq("user_id", user.id)
    .eq("church_id", profile.church_id)
    .eq("is_active", true);

  if (rolesError || !roles || roles.length === 0) {
    return { 
      success: false, 
      error: "Forbidden - User has no active roles", 
      status: 403 
    };
  }

  // Determine highest role
  const roleOrder = ["church_admin", "branch_admin", "usher", "member"];
  const sortedRoles = roles.sort((a, b) => 
    roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  );
  const primaryRole = sortedRoles[0];

  // Get accessible branch IDs
  const accessibleBranchIds = primaryRole.role === "church_admin"
    ? [] // Church admin can access all - we'll handle this specially
    : [...new Set(roles.map(r => r.branch_id).filter(Boolean) as string[])];

  // Check if required role is present
  if (options?.requireRole && options.requireRole.length > 0) {
    const userRoles = roles.map(r => r.role);
    const hasRequiredRole = options.requireRole.some(r => userRoles.includes(r));
    
    if (!hasRequiredRole) {
      return { 
        success: false, 
        error: `Forbidden - Requires one of: ${options.requireRole.join(", ")}`, 
        status: 403 
      };
    }
  }

  // Verify against specific church if required
  if (options?.requireChurchId && options.requireChurchId !== profile.church_id) {
    // Don't reveal that the church exists - return generic 403
    return { 
      success: false, 
      error: "Forbidden - Access denied", 
      status: 403 
    };
  }

  return {
    success: true,
    user: {
      userId: user.id,
      email: user.email,
      churchId: profile.church_id,
      role: primaryRole.role,
      branchId: primaryRole.branch_id,
      accessibleBranchIds,
    },
  };
}

/**
 * Verify that a resource belongs to the user's church
 * Use this to prevent cross-tenant access
 * 
 * @param adminClient - Service role Supabase client
 * @param table - Table name to check
 * @param resourceId - ID of the resource
 * @param userChurchId - The authenticated user's church ID
 * @returns true if resource belongs to user's church
 */
export async function verifyResourceOwnership(
  adminClient: SupabaseClient,
  table: string,
  resourceId: string,
  userChurchId: string
): Promise<boolean> {
  const { data, error } = await adminClient
    .from(table)
    .select("church_id")
    .eq("id", resourceId)
    .single();

  if (error || !data) return false;
  return data.church_id === userChurchId;
}

/**
 * Create an error response with proper headers
 */
export function authErrorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

/**
 * Get admin Supabase client
 */
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export { corsHeaders };
