/**
 * Server-side rate limiting utilities for Edge Functions
 * Uses in-memory storage with fallback behavior for edge function cold starts
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

// In-memory rate limit storage (resets on cold start - acceptable for edge functions)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limiting configurations
export const RATE_LIMIT_CONFIGS = {
  // Login/auth endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    lockoutMs: 30 * 60 * 1000, // 30 minute lockout
  },
  // OTP endpoints - very strict
  otp: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    lockoutMs: 60 * 60 * 1000, // 1 hour lockout
  },
  // Payment endpoints - moderate
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 10,
    lockoutMs: 60 * 60 * 1000, // 1 hour lockout
  },
  // General API - relaxed
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 60,
    lockoutMs: 5 * 60 * 1000, // 5 minute lockout
  },
  // Public endpoints (self-checkin, etc.)
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 30,
    lockoutMs: 5 * 60 * 1000, // 5 minute lockout
  },
};

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Extract client identifier for rate limiting
 * Combines IP + optional account identifier for defense in depth
 */
export function getClientIdentifier(req: Request, accountId?: string): string {
  // Try to get real IP from various headers (in order of preference)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  let ip = "unknown";
  if (cfConnectingIp) {
    ip = cfConnectingIp;
  } else if (realIp) {
    ip = realIp;
  } else if (forwardedFor) {
    // Take first IP from comma-separated list
    ip = forwardedFor.split(",")[0].trim();
  }
  
  // Combine IP with account identifier if provided
  if (accountId) {
    return `${ip}:${accountId.toLowerCase()}`;
  }
  return ip;
}

/**
 * Check if a client is rate limited
 */
export function checkServerRateLimit(
  identifier: string,
  type: RateLimitType = "general"
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const config = RATE_LIMIT_CONFIGS[type];
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No entry - first request
  if (!entry) {
    return { allowed: true, remaining: config.maxAttempts };
  }

  // Check if locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Check if window has expired (reset counter)
  if (now - entry.firstAttempt > config.windowMs) {
    rateLimitStore.delete(identifier);
    return { allowed: true, remaining: config.maxAttempts };
  }

  // Check if under limit
  if (entry.count < config.maxAttempts) {
    return { allowed: true, remaining: config.maxAttempts - entry.count };
  }

  // Over limit - apply lockout
  const retryAfter = Math.ceil(config.lockoutMs / 1000);
  return { allowed: false, retryAfter };
}

/**
 * Record an attempt for rate limiting
 */
export function recordAttempt(
  identifier: string,
  type: RateLimitType = "general"
): { remaining: number; isLocked: boolean } {
  const config = RATE_LIMIT_CONFIGS[type];
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.firstAttempt > config.windowMs) {
    // Start new window
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      lockedUntil: null,
    });
    return { remaining: config.maxAttempts - 1, isLocked: false };
  }

  // Increment counter
  entry.count++;
  
  // Check if should lock out
  if (entry.count >= config.maxAttempts) {
    entry.lockedUntil = now + config.lockoutMs;
    rateLimitStore.set(identifier, entry);
    return { remaining: 0, isLocked: true };
  }

  rateLimitStore.set(identifier, entry);
  return { remaining: config.maxAttempts - entry.count, isLocked: false };
}

/**
 * Clear rate limit for an identifier (e.g., on successful login)
 */
export function clearServerRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Create rate limit exceeded response with standard headers
 */
export function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter 
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

/**
 * Cleanup old entries (call periodically to prevent memory bloat)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
