# API Security Protections

This document outlines the baseline API security protections implemented across all Edge Functions.

## Security Discovery Summary

| Aspect | Implementation |
|--------|---------------|
| **Auth Type** | Token-based (JWT via Supabase, localStorage) |
| **CSRF** | Not required (no cookie-based auth) |
| **CORS** | Allowlist-based origin validation |
| **Rate Limiting** | IP + account-based, per-endpoint |
| **Security Headers** | OWASP-recommended headers on all responses |

## Rate Limiting

### Configuration (`_shared/rate-limiting.ts`)

| Endpoint Type | Window | Max Attempts | Lockout |
|--------------|--------|--------------|---------|
| `auth` | 15 min | 5 | 30 min |
| `otp` | 1 hour | 3 | 1 hour |
| `payment` | 1 hour | 10 | 1 hour |
| `general` | 1 min | 60 | 5 min |
| `public` | 1 min | 30 | 5 min |

### Features
- **Dual limiting**: Both IP-based and account-based limits
- **Client identification**: Uses `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`
- **429 responses**: Include `Retry-After` header
- **Automatic cleanup**: Prevents memory bloat

## CORS Hardening (`_shared/cors.ts`)

### Allowed Origins
- Production: `https://easychurchflow.com`, `https://www.easychurchflow.com`
- Lovable: `*.lovableproject.com`, `*.lovable.app`
- Development: `localhost:*` (non-production only)

### Configuration
Set `ALLOWED_ORIGINS` environment variable (comma-separated) to customize:
```
ALLOWED_ORIGINS=https://mydomain.com,https://app.mydomain.com
```

### Behavior
- Valid origins: Receive proper `Access-Control-Allow-Origin`
- Invalid origins: CORS fails (no origin header returned)
- Server-to-server (no origin): Allowed for webhooks

## Security Headers (`_shared/security-headers.ts`)

All API responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cache-Control: no-store, no-cache, must-revalidate
```

## Error Response Sanitization

### Patterns Removed
- Stack traces
- File paths with line numbers
- Environment variable names
- Database connection strings
- IP addresses
- Credentials

### Safe Error Messages
```typescript
SAFE_ERROR_MESSAGES = {
  unauthorized: "Authentication required",
  forbidden: "Access denied",
  notFound: "Resource not found",
  badRequest: "Invalid request",
  rateLimit: "Too many requests. Please try again later.",
  serverError: "An unexpected error occurred. Please try again.",
}
```

## Protected Endpoints

| Endpoint | Rate Limit | Auth Required | Notes |
|----------|------------|---------------|-------|
| `send-signup-otp` | `otp` | No | IP + email limiting |
| `verify-signup-otp` | `otp` | No | Clears on success |
| `send-password-reset-otp` | `otp` | No | Non-revealing responses |
| `verify-and-reset-password` | `otp` | No | Single-use OTP |
| `verify-member-phone` | `auth` | No | Timing jitter |
| `paystack-checkout` | `payment` | Yes | JWT validation |
| `self-checkin` | `public` | No | Public endpoint |

## Testing

### Rate Limiting Test
```bash
# Should get 429 after 3 OTP requests
for i in {1..5}; do
  curl -X POST https://[project].supabase.co/functions/v1/send-signup-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","churchName":"Test"}'
done
```

### CORS Test
```bash
# Should fail CORS (no Access-Control-Allow-Origin)
curl -H "Origin: https://malicious.com" \
  https://[project].supabase.co/functions/v1/verify-member-phone

# Should succeed
curl -H "Origin: https://easychurchflow.com" \
  https://[project].supabase.co/functions/v1/verify-member-phone
```

## Local Development

Rate limiting and CORS are lenient for `localhost` in non-production environments. Set `ENVIRONMENT=development` for full local dev support.
