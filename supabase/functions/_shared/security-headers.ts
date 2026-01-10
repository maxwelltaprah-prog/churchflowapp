/**
 * Security headers for Edge Function responses
 * Implements OWASP recommended headers
 */

/**
 * Standard security headers for API responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",
  
  // Prevent clickjacking (frame embedding)
  "X-Frame-Options": "DENY",
  
  // Enable XSS filter in older browsers
  "X-XSS-Protection": "1; mode=block",
  
  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",
  
  // Permissions policy - disable unnecessary features
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  
  // Cache control for API responses
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * Get security headers with CORS merged
 */
export function getSecureHeaders(corsHeaders: Record<string, string>): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    ...corsHeaders,
    "Content-Type": "application/json",
  };
}

/**
 * Create a secure JSON response with all security headers
 */
export function secureJsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getSecureHeaders(corsHeaders),
  });
}

/**
 * Create a secure error response
 * Sanitizes error messages to prevent information leakage
 */
export function secureErrorResponse(
  message: string,
  corsHeaders: Record<string, string>,
  status: number = 400
): Response {
  // Sanitize error message - remove any potential stack traces or internal details
  const sanitizedMessage = sanitizeErrorMessage(message);
  
  return new Response(
    JSON.stringify({ error: sanitizedMessage }),
    {
      status,
      headers: getSecureHeaders(corsHeaders),
    }
  );
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeErrorMessage(message: string): string {
  // List of patterns that might leak internal information
  const sensitivePatterns = [
    /at\s+\S+\s+\([^)]+\)/gi, // Stack trace lines
    /\b(password|secret|key|token|bearer)\s*[:=]\s*\S+/gi, // Credentials
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /\/[\w/.-]+\.ts:\d+:\d+/gi, // File paths with line numbers
    /SUPABASE_\w+/gi, // Environment variable names
    /postgres:\/\/[^@]+@[^/]+/gi, // Database connection strings
    /Error:\s*.*\n\s+at\s+/gi, // Error stack traces
  ];
  
  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  
  // Truncate very long messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + "...";
  }
  
  return sanitized;
}

/**
 * Generic safe error messages for different error types
 */
export const SAFE_ERROR_MESSAGES = {
  unauthorized: "Authentication required",
  forbidden: "Access denied",
  notFound: "Resource not found",
  badRequest: "Invalid request",
  rateLimit: "Too many requests. Please try again later.",
  serverError: "An unexpected error occurred. Please try again.",
  validation: "Invalid input data",
  conflict: "Resource already exists",
};
