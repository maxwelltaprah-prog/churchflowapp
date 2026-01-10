/**
 * Security utilities for authentication hardening
 * This module provides client-side security helpers
 */

// Rate limiting state stored per-session
const rateLimitStore = new Map<string, { attempts: number; lockoutUntil: number | null; lastAttempt: number }>();

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if an identifier is currently rate limited
 * @param identifier - Email or phone number to check
 * @returns Object with isLocked status and remainingTime in seconds
 */
export function checkRateLimit(identifier: string): { isLocked: boolean; remainingTime: number; attempts: number } {
  const normalizedId = identifier.toLowerCase().trim();
  const state = rateLimitStore.get(normalizedId);
  
  if (!state) {
    return { isLocked: false, remainingTime: 0, attempts: 0 };
  }
  
  const now = Date.now();
  
  // Check if lockout has expired
  if (state.lockoutUntil && now >= state.lockoutUntil) {
    // Reset after lockout expires
    rateLimitStore.delete(normalizedId);
    return { isLocked: false, remainingTime: 0, attempts: 0 };
  }
  
  // Check if we're in lockout
  if (state.lockoutUntil) {
    const remainingTime = Math.ceil((state.lockoutUntil - now) / 1000);
    return { isLocked: true, remainingTime, attempts: state.attempts };
  }
  
  // Check if attempts should be reset (outside window)
  if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
    rateLimitStore.delete(normalizedId);
    return { isLocked: false, remainingTime: 0, attempts: 0 };
  }
  
  return { isLocked: false, remainingTime: 0, attempts: state.attempts };
}

/**
 * Record a failed login attempt
 * @param identifier - Email or phone number
 * @returns Object with isLocked status and remainingTime if locked
 */
export function recordFailedAttempt(identifier: string): { isLocked: boolean; remainingTime: number; attemptsRemaining: number } {
  const normalizedId = identifier.toLowerCase().trim();
  const now = Date.now();
  const state = rateLimitStore.get(normalizedId) || { attempts: 0, lockoutUntil: null, lastAttempt: now };
  
  // Reset if outside window
  if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
    state.attempts = 0;
    state.lockoutUntil = null;
  }
  
  state.attempts += 1;
  state.lastAttempt = now;
  
  // Check if we should lock
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockoutUntil = now + LOCKOUT_DURATION_MS;
    rateLimitStore.set(normalizedId, state);
    const remainingTime = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { isLocked: true, remainingTime, attemptsRemaining: 0 };
  }
  
  rateLimitStore.set(normalizedId, state);
  return { isLocked: false, remainingTime: 0, attemptsRemaining: MAX_ATTEMPTS - state.attempts };
}

/**
 * Clear rate limiting for an identifier (on successful login)
 * @param identifier - Email or phone number
 */
export function clearRateLimit(identifier: string): void {
  const normalizedId = identifier.toLowerCase().trim();
  rateLimitStore.delete(normalizedId);
}

/**
 * Format lockout time for display
 * @param seconds - Remaining lockout time in seconds
 * @returns Human-readable time string
 */
export function formatLockoutTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
