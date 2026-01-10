/**
 * CORS configuration for Edge Functions
 * Implements allowlist-based origin validation
 */

/**
 * Get allowed origins from environment or use safe defaults
 * In production, this should be configured via environment variables
 */
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  
  if (envOrigins) {
    return envOrigins.split(",").map(origin => origin.trim());
  }
  
  // Default allowed origins for this project
  const projectId = Deno.env.get("SUPABASE_PROJECT_REF") || "nytqwqfafdcaviiwjyjw";
  
  return [
    // Production domains
    "https://easychurchflow.com",
    "https://www.easychurchflow.com",
    // Lovable preview/dev domains
    `https://${projectId}.supabase.co`,
    "https://lovable.dev",
    "https://gptengineer.app",
    // Common Lovable patterns
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
    /^https:\/\/[a-z0-9-]+--[a-z0-9]+\.lovable\.app$/,
  ].filter(o => typeof o === "string") as string[];
}

// Regex patterns for dynamic origins
const LOVABLE_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+--[a-z0-9]+\.lovable\.app$/,
  /^https:\/\/id-[a-z0-9-]+\.lovableproject\.com$/,
];

/**
 * Validate if an origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check regex patterns for Lovable domains
  for (const pattern of LOVABLE_ORIGIN_PATTERNS) {
    if (pattern.test(origin)) {
      return true;
    }
  }
  
  // In development, allow localhost
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    const isDev = Deno.env.get("ENVIRONMENT") === "development" || 
                  Deno.env.get("DENO_ENV") === "development";
    if (isDev) {
      return true;
    }
    // Also allow in non-production for easier development
    const isProduction = Deno.env.get("ENVIRONMENT") === "production";
    if (!isProduction) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get CORS headers for a request
 * Returns appropriate headers based on origin validation
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  
  // Base headers that are always included
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
  
  if (isAllowedOrigin(origin)) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": origin!,
      "Vary": "Origin",
    };
  }
  
  // For disallowed origins, don't set Access-Control-Allow-Origin
  // This will cause CORS to fail in the browser
  return baseHeaders;
}

/**
 * Get CORS headers for public endpoints (webhooks, etc.)
 * Still validates origin but with more lenient fallback
 */
export function getPublicCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  
  // For public endpoints (webhooks), we may need to be more permissive
  // but still validate when origin is present
  if (origin && isAllowedOrigin(origin)) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    };
  }
  
  // For requests without origin (server-to-server), allow
  // This is needed for webhook callbacks
  if (!origin) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": "*",
    };
  }
  
  return baseHeaders;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Handle public CORS preflight request
 */
export function handlePublicCorsPreflightRequest(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getPublicCorsHeaders(req),
  });
}
