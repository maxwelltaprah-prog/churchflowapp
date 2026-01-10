# Secrets Management

This document outlines the secrets management strategy for the ChurchFlow application.

## What is Considered a Secret?

### Secrets (NEVER in client code or logs)
- **Database Service Role Keys**: `SUPABASE_SERVICE_ROLE_KEY`
- **Payment API Keys**: `PAYSTACK_SECRET_KEY`, `HUBTEL_CLIENT_SECRET`
- **SMS Provider Keys**: `BULKSMSGH_API_KEY`, `SMSONLINEGH_API_KEY`
- **Email Service Keys**: `RESEND_API_KEY`
- **Any key prefixed with `sk_`, `secret_`, or containing `SECRET`**

### Publishable Keys (Safe for client-side)
- **Supabase Anon/Publishable Key**: `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY`
- **Paystack Public Key**: `PAYSTACK_PUBLIC_KEY`
- **Supabase Project URL**: `SUPABASE_URL`
- **Any key prefixed with `pk_` or `public_`**

## Current Secret Storage

### Backend Secrets (Supabase Edge Functions)
All secrets are stored in Supabase's secure secrets vault and accessed via `Deno.env.get()`:

| Secret Name | Purpose | Used By |
|-------------|---------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Database admin access | All edge functions |
| `PAYSTACK_SECRET_KEY` | Payment processing | paystack-checkout, paystack-verify, paystack-webhook |
| `HUBTEL_CLIENT_ID` | SMS payment | initiate-sms-payment |
| `HUBTEL_CLIENT_SECRET` | SMS payment | initiate-sms-payment |
| `BULKSMSGH_API_KEY` | SMS sending | send-sms-campaign, resend-failed-sms |
| `RESEND_API_KEY` | Email sending | send-signup-otp, send-password-reset-otp |
| `RESEND_FROM` | Email sender address | send-signup-otp, send-password-reset-otp |

### Frontend Secrets (Publishable Only)
The `.env` file contains ONLY publishable keys:
- `VITE_SUPABASE_PROJECT_ID` - Project identifier
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key (safe for client)
- `VITE_SUPABASE_URL` - API endpoint

**Note**: The `.env` file in this project is auto-managed by Lovable Cloud and contains only publishable keys that are safe to expose.

## Security Controls

### 1. Server-Side Secret Validation
All edge functions validate required secrets at startup:

```typescript
import { getRequiredSecret, validateRequiredSecrets } from "../_shared/safe-logging.ts";

// Fail fast if secrets are missing
validateRequiredSecrets([
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY"
]);

// Or get individual secrets with validation
const apiKey = getRequiredSecret("PAYSTACK_SECRET_KEY");
```

### 2. Safe Logging
All edge functions use sanitized logging to prevent secret leakage:

```typescript
import { safeLog, safeError, structuredLog } from "../_shared/safe-logging.ts";

// SAFE: Automatically sanitizes sensitive data
safeLog("Processing payment", { customerId, amount });

// UNSAFE: Raw console.log might leak secrets
console.log("Payment data:", paymentData); // DON'T DO THIS
```

### 3. Error Response Sanitization
All error responses are sanitized before being sent to clients:

```typescript
import { secureErrorResponse, sanitizeErrorMessage } from "../_shared/security-headers.ts";

// Returns generic error message, logs details server-side
return secureErrorResponse("Payment failed", corsHeaders, 500);
```

## Key Rotation Checklist

When rotating secrets, follow this procedure:

### 1. Pre-Rotation
- [ ] Identify all services using the secret
- [ ] Generate new secret in the provider's dashboard
- [ ] Keep old secret active during transition

### 2. Rotation
- [ ] Update secret in Supabase Dashboard → Settings → Edge Functions → Secrets
- [ ] Deploy edge functions to pick up new secret
- [ ] Verify functionality with test transactions

### 3. Post-Rotation
- [ ] Confirm all services are using new secret
- [ ] Revoke old secret in provider dashboard
- [ ] Document rotation date in security log

### Rotation by Secret Type

#### Paystack Keys
1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
2. Generate new secret key
3. Update `PAYSTACK_SECRET_KEY` in Supabase secrets
4. Test checkout and webhook endpoints
5. Revoke old key

#### Resend API Key
1. Go to Resend Dashboard → API Keys
2. Create new API key
3. Update `RESEND_API_KEY` in Supabase secrets
4. Test OTP email sending
5. Delete old key

#### BulkSMSGH API Key
1. Contact BulkSMSGH support for new API key
2. Update `BULKSMSGH_API_KEY` in Supabase secrets
3. Test SMS campaign sending
4. Request old key deactivation

#### Hubtel Credentials
1. Go to Hubtel Dashboard → Developers → API Credentials
2. Generate new client ID and secret
3. Update both `HUBTEL_CLIENT_ID` and `HUBTEL_CLIENT_SECRET`
4. Test SMS payment flow
5. Revoke old credentials

## Repository Hygiene

### Protected Patterns
The following should NEVER be committed:
- `.env.local`, `.env.production`, `.env.*.local`
- Any file containing `sk_`, `secret_`, or API keys
- Database connection strings with passwords

### Recommended .gitignore Additions
```gitignore
# Secrets
.env.local
.env.*.local
.env.production
*.pem
*.key
secrets/
credentials/
```

### Secret Scanning
For CI/CD pipelines, consider adding:

```yaml
# GitHub Actions example
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
```

## Production Boot Validation

Edge functions validate secrets on cold start. If required secrets are missing:
1. Function logs error: "Missing required secrets: [names]"
2. Function throws: "Application misconfigured"
3. Request returns 500 error with generic message

This "fail fast" approach prevents the application from running in a misconfigured state.

## Audit Logging

Security-sensitive operations are logged with sanitized data:
- Payment transactions (amount, status, masked reference)
- SMS campaigns (count, church_id, no phone numbers)
- Authentication events (user_id, event type, no credentials)
- OTP generation (email domain only, no code)

## Incident Response

If a secret is compromised:

1. **Immediate**: Revoke compromised secret at provider
2. **Within 1 hour**: Deploy new secret to Supabase
3. **Within 24 hours**: Audit access logs for unauthorized use
4. **Within 48 hours**: Document incident and update procedures

## Contact

For security concerns, contact the development team immediately.
