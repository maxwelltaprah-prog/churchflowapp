/**
 * Shared security utilities for edge functions
 */

/**
 * Generate a cryptographically secure OTP
 * @param length - Length of OTP (default 6)
 * @returns Secure random OTP string
 */
export function generateSecureOTP(length: number = 6): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Convert to number in range [100000, 999999] for 6 digits
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = min + (array[0] % (max - min + 1));
  return otp.toString();
}

/**
 * Hash an OTP using SHA-256
 * @param otp - Plain text OTP
 * @param salt - Salt for hashing (use email or unique identifier)
 * @returns Hashed OTP
 */
export async function hashOTP(otp: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + salt.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify an OTP against its hash
 * @param otp - Plain text OTP to verify
 * @param hash - Stored hash
 * @param salt - Salt used for hashing
 * @returns True if OTP matches
 */
export async function verifyOTP(otp: string, hash: string, salt: string): Promise<boolean> {
  const computedHash = await hashOTP(otp, salt);
  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create a generic error response that doesn't leak information
 * @param message - Generic error message
 * @param corsHeaders - CORS headers to include
 * @returns Response object
 */
export function genericErrorResponse(message: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

/**
 * Add artificial delay to prevent timing attacks
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
export async function addTimingJitter(minMs: number = 100, maxMs: number = 300): Promise<void> {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const delay = minMs + (array[0] % (maxMs - minMs + 1));
  await new Promise(resolve => setTimeout(resolve, delay));
}
