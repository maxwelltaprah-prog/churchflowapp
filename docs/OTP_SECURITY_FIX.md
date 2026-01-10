# OTP Security Fix Documentation

## Issue Summary

The `signup_otps` and `password_reset_otps` tables had RLS enabled but NO policies defined. This was flagged as a potential account takeover vulnerability.

## Discovery Report

### Files Referencing OTP Tables

| File | Purpose |
|------|---------|
| `supabase/functions/send-signup-otp/index.ts` | Creates hashed OTPs (service role only) |
| `supabase/functions/verify-signup-otp/index.ts` | Verifies OTPs against hash (service role only) |
| `supabase/functions/send-password-reset-otp/index.ts` | Creates password reset OTPs (service role only) |
| `supabase/functions/verify-and-reset-password/index.ts` | Verifies reset OTPs (service role only) |
| `supabase/functions/cleanup-expired-otps/index.ts` | Deletes expired OTPs (service role only) |

### Code Path Analysis

**OTP Creation:**
1. Client calls `supabase.functions.invoke("send-signup-otp")` (no direct table access)
2. Edge function uses `SUPABASE_SERVICE_ROLE_KEY` to insert hashed OTP
3. OTP is hashed with SHA-256 using email as salt before storage

**OTP Verification:**
1. Client calls `supabase.functions.invoke("verify-signup-otp")`
2. Edge function uses service role to fetch hashed OTP
3. Constant-time comparison via `verifyOTP()` function
4. OTP codes are NEVER returned to client

### Client Access Assessment

- ✅ Client uses `supabase.functions.invoke()` - NO direct table queries
- ✅ Client-side Supabase instance uses anon key only
- ✅ Service role key is server-side only (edge functions)
- ✅ OTPs are hashed before storage (no plaintext)

## Security Fix Applied

### New RLS Policies

| Policy Name | Table | Role | Effect |
|-------------|-------|------|--------|
| `No anon access to signup_otps` | `signup_otps` | anon | DENY ALL |
| `No authenticated access to signup_otps` | `signup_otps` | authenticated | DENY ALL |
| `No anon access to password_reset_otps` | `password_reset_otps` | anon | DENY ALL |
| `No authenticated access to password_reset_otps` | `password_reset_otps` | authenticated | DENY ALL |

All policies use `AS RESTRICTIVE` to ensure they cannot be bypassed by other permissive policies.

### Server-Only Code Paths

| Operation | Edge Function | Service Role Used |
|-----------|---------------|-------------------|
| Send signup OTP | `send-signup-otp/index.ts:68-69` | ✅ |
| Verify signup OTP | `verify-signup-otp/index.ts:56-57` | ✅ |
| Send reset OTP | `send-password-reset-otp/index.ts` | ✅ |
| Verify reset OTP | `verify-and-reset-password/index.ts` | ✅ |
| Cleanup expired | `cleanup-expired-otps/index.ts:16-17` | ✅ |

## Security Measures Already in Place

### 1. OTP Hashing
- OTPs are hashed using SHA-256 with email as salt
- Plaintext OTP is never stored in database
- Only hashed values are persisted

### 2. Rate Limiting
- IP-based rate limiting (5 requests per 15 minutes)
- Email-based rate limiting (stricter)
- Both `send` and `verify` endpoints are rate-limited

### 3. Timing Attack Prevention
- Constant-time comparison via `verifyOTP()`
- Artificial timing jitter added to responses
- Consistent response times regardless of validation outcome

### 4. TTL Enforcement
- OTPs expire after 10 minutes
- Expired OTPs are deleted on verification attempt
- Background cleanup job removes old OTPs hourly

### 5. Generic Error Messages
- Errors don't reveal whether email exists
- Same response format for invalid/expired/missing OTPs

## Confirmation

✅ **Client has ZERO access to `signup_otps` and `password_reset_otps` tables**

Any attempt to query these tables from the client will return an empty result or permission denied error, regardless of authentication status.

## Testing

Run the security tests:

```bash
npm run test -- src/test/security/otp-rls-security.test.ts
```

Tests verify:
1. Authenticated users cannot SELECT from OTP tables
2. Authenticated users cannot INSERT into OTP tables  
3. Anonymous users cannot access OTP tables
4. OTP codes are never returned by API endpoints
