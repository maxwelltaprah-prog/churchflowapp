# Deployment Security Checklist

This document provides a comprehensive security checklist for deploying ChurchFlow in production environments.

## Pre-Deployment Checklist

### 1. Environment Configuration

| Check | Status | Notes |
|-------|--------|-------|
| ☐ `ENVIRONMENT` set to `production` | Required | Disables localhost CORS, enables strict logging |
| ☐ Debug mode disabled | Required | No verbose error responses |
| ☐ All required secrets configured | Required | See [Secrets Management](./SECRETS_MANAGEMENT.md) |
| ☐ `ALLOWED_ORIGINS` configured | Recommended | Restrict CORS to production domains only |

### 2. Network & Database Security

| Check | Status | Notes |
|-------|--------|-------|
| ☐ Database not publicly accessible | Critical | Use Lovable Cloud's managed infrastructure |
| ☐ All connections use TLS/HTTPS | Critical | Enforced by Lovable Cloud |
| ☐ RLS policies enabled on all tables | Critical | See [Database RLS](./IDOR_BOLA_SECURITY.md) |
| ☐ Service role key isolated to Edge Functions | Critical | Never expose in client code |

### 3. Authentication & Authorization

| Check | Status | Notes |
|-------|--------|-------|
| ☐ JWT verification enabled for protected endpoints | Critical | All non-webhook endpoints |
| ☐ Rate limiting active on auth endpoints | Critical | OTP, login, password reset |
| ☐ Session cookies are Secure + HttpOnly | Critical | Managed by Supabase Auth |
| ☐ CORS allowlist properly configured | Critical | No wildcard in production |

### 4. Secrets Management

| Check | Status | Notes |
|-------|--------|-------|
| ☐ No secrets in client-side code | Critical | Only publishable keys allowed |
| ☐ No secrets in Git history | Critical | Use git-secrets or TruffleHog |
| ☐ Secrets rotated after exposure | Critical | Follow rotation procedures |
| ☐ Required secrets validated at runtime | Required | Edge functions fail-fast |

---

## Required Inbound/Outbound Ports

### Inbound (to Edge Functions)
| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | HTTPS | All API traffic (Lovable Cloud managed) |

### Outbound (from Edge Functions)
| Destination | Port | Purpose |
|-------------|------|---------|
| Supabase DB | 5432/6543 | Database connections (internal) |
| api.resend.com | 443 | Email delivery |
| api.paystack.co | 443 | Payment processing |
| sms.hubtel.com | 443 | SMS delivery |
| api.bulksmsgh.com | 443 | SMS delivery |

---

## TLS & Cookie Security

### HTTPS Enforcement
- **Lovable Cloud**: HTTPS is enforced automatically
- **Custom Domain**: TLS certificates are auto-provisioned
- **HSTS**: Recommended header (add via meta tag if needed)

### Cookie Configuration (Supabase Auth)
The following cookie settings are enforced by Supabase Auth:

```
Secure: true (HTTPS only)
HttpOnly: true (no JavaScript access)
SameSite: Lax (CSRF protection)
Path: / 
```

---

## Least Privilege Configuration

### Service Accounts & Keys

| Key/Account | Privilege Level | Used By |
|-------------|-----------------|---------|
| `SUPABASE_ANON_KEY` | Public/RLS-restricted | Client app (published) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin (bypasses RLS) | Edge Functions only |
| `PAYSTACK_SECRET_KEY` | Payment processing | Edge Functions only |
| `RESEND_API_KEY` | Email sending | Edge Functions only |
| `BULKSMSGH_API_KEY` | SMS sending | Edge Functions only |
| `HUBTEL_CLIENT_SECRET` | SMS/Payment | Edge Functions only |

### Privilege Separation

1. **Client App**: Only uses anon key, all data access governed by RLS
2. **Edge Functions**: Service role for admin operations, validated by `authorizeRequest()`
3. **Webhooks**: Signature verification before processing
4. **Scheduled Jobs**: Service role with specific scoped operations

---

## Environment Separation

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| `ENVIRONMENT` | `development` | `production` |
| CORS localhost | Allowed | Blocked |
| Error details | Verbose | Sanitized |
| Stack traces | Logged | Hidden |
| Rate limiting | Lenient | Strict |
| OTP in logs | Allowed | Blocked |

### Configuration Locations

- **Client Config**: `.env` (publishable keys only)
- **Edge Function Config**: Supabase Secrets (all sensitive keys)
- **CORS Config**: `supabase/functions/_shared/cors.ts`

---

## Runtime Security Validation

A runtime self-check runs on Edge Function cold start to validate security configuration:

```typescript
// Validated on every Edge Function boot:
1. Required secrets present (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
2. Environment not set to "development" in production
3. CORS origins properly configured
4. Rate limiting enabled
```

See: `supabase/functions/_shared/deployment-check.ts`

---

## Security Headers (Edge Functions)

All API responses include:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cache-Control: no-store, no-cache, must-revalidate
```

---

## Content Security Policy (Client)

The CSP in `index.html` restricts:

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default to same-origin |
| `script-src` | `'self' + CDN` | Controlled script sources |
| `connect-src` | Supabase domains | API connections only |
| `frame-ancestors` | `'none'` | Prevent embedding |
| `form-action` | `'self'` | Prevent form hijacking |

---

## Webhook Security

| Webhook | Verification Method |
|---------|---------------------|
| Paystack | HMAC-SHA512 signature |
| Hubtel | Shared secret validation |
| SMS Delivery | Provider message ID matching |

---

## Incident Response

If security is compromised:

1. **Rotate all secrets immediately** (see SECRETS_MANAGEMENT.md)
2. **Review access logs** (Supabase dashboard)
3. **Invalidate active sessions** (Supabase Auth)
4. **Document and report** the incident

---

## Compliance Notes

- **HTTPS Only**: All traffic encrypted in transit
- **Data Encryption**: Supabase encrypts data at rest
- **Access Logging**: All database queries logged
- **PII Protection**: Phone/email sanitized from logs
