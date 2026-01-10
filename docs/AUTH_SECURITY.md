# Auth Security Hardening Documentation

## Overview
This document describes the security hardening applied to the authentication system.

## Changes Made

### 1. Cryptographically Secure OTP Generation
**Files:** `supabase/functions/_shared/security.ts`, all OTP functions
- Replaced `Math.random()` with `crypto.getRandomValues()` for OTP generation
- OTPs are now cryptographically secure random numbers

### 2. OTP Hashing
**Files:** `send-signup-otp`, `verify-signup-otp`, `send-password-reset-otp`, `verify-and-reset-password`
- OTPs are now SHA-256 hashed before storage (using email as salt)
- Plain text OTPs are never stored in the database
- Verification uses constant-time comparison to prevent timing attacks

### 3. Rate Limiting
**Server-side (Edge Functions):**
- Max 3 OTP requests per minute per email
- Max 5 verification attempts per 15 minutes per email

**Client-side (`src/lib/security-utils.ts`):**
- Max 5 failed login attempts within 5 minutes
- 15-minute lockout after exceeding limit
- Applied to both admin and member login flows

### 4. Timing Attack Prevention
**Files:** All OTP edge functions
- Added artificial timing jitter (100-400ms) to prevent enumeration
- Consistent response times regardless of user existence

### 5. Generic Error Messages
- Login/reset flows return consistent messages that don't reveal user existence
- Error messages sanitized to prevent information leakage

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/security.ts` | NEW - Shared security utilities |
| `src/lib/security-utils.ts` | NEW - Client-side rate limiting |
| `supabase/functions/send-password-reset-otp/index.ts` | Hashed OTPs, rate limiting, timing jitter |
| `supabase/functions/verify-and-reset-password/index.ts` | OTP hash verification, rate limiting |
| `supabase/functions/send-signup-otp/index.ts` | Hashed OTPs, rate limiting |
| `supabase/functions/verify-signup-otp/index.ts` | OTP hash verification, rate limiting |
| `src/pages/Login.tsx` | Client-side rate limiting |
| `src/pages/MemberLogin.tsx` | Client-side rate limiting |

## How to Test

### Rate Limiting
1. Attempt 5+ failed logins with same email
2. Should see lockout message after 5 attempts
3. Wait 15 minutes or clear localStorage to reset

### OTP Security
1. Request password reset OTP
2. Check database - `otp_code` should be a 64-char hash, not 6 digits
3. Enter wrong OTP 5 times - should see rate limit message

### Timing Protection
1. Request OTP for non-existent email
2. Response time should be similar to valid email requests

## Limitations
- Client-side rate limiting resets on page refresh (defense-in-depth with server-side)
- In-memory server rate limiting resets on cold starts (acceptable for edge functions)
- Session tokens managed by Supabase SDK (httpOnly cookies not applicable)

## Security Model
- **Defense in Depth**: Both client and server-side rate limiting
- **Principle of Least Information**: Generic error messages
- **Secure by Default**: Cryptographic OTP generation and storage
