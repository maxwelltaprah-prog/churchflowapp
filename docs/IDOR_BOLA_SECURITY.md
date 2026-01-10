# IDOR/BOLA Security Hardening Documentation

## Overview
This document describes the security hardening applied to prevent Insecure Direct Object Reference (IDOR) and Broken Object Level Authorization (BOLA) vulnerabilities.

## Problem Statement
Several edge functions were accepting tenant identifiers (`churchId`, `userId`) directly from the request body and using them for database operations without verifying the authenticated user's actual relationship to that tenant.

### Vulnerable Pattern (Before)
```typescript
// ❌ INSECURE - Trusts client-provided churchId
const { churchId, userId } = await req.json();
await supabase.from("sms_campaigns").insert({ church_id: churchId, ...});
```

### Secure Pattern (After)
```typescript
// ✅ SECURE - Derives churchId from authenticated user
const authResult = await authorizeRequest(req);
const churchId = authResult.user.churchId; // From user's profile
await supabase.from("sms_campaigns").insert({ church_id: churchId, ...});
```

## Changes Made

### 1. Shared Authorization Module
**File:** `supabase/functions/_shared/authorization.ts` (NEW)

Created a centralized authorization module that:
- Extracts and verifies JWT from Authorization header
- Queries user's profile to derive `church_id`
- Fetches user's active roles and permissions
- Enforces role requirements
- Returns authorized user context with derived values

### 2. Edge Functions Hardened

| Function | Change |
|----------|--------|
| `send-sms-campaign/index.ts` | Now derives `churchId`/`userId` from auth, verifies group/member ownership |
| `manage-sms-wallet/index.ts` | Now derives `churchId` from auth, verifies purchase ownership |
| `initiate-sms-payment/index.ts` | Now derives `churchId`/`userId` from auth |
| `resend-failed-sms/index.ts` | Now derives `churchId` from auth, verifies campaign ownership |

### 3. Already Secure Functions (No Changes Needed)

| Function | Why Already Secure |
|----------|-------------------|
| `reset-member-pin` | Already validates admin belongs to same church as target member |
| `paystack-checkout` | Already derives church_id from authenticated user's profile |
| `paystack-webhook` | Webhook signature verification, no user-provided IDs |
| `hubtel-payment-callback` | Webhook, uses reference to find purchase |

## Route Authorization Matrix

| Route | Method | Resource | Required Role(s) | Tenant Rule |
|-------|--------|----------|-----------------|-------------|
| `/send-sms-campaign` | POST | SMS Campaigns | church_admin, branch_admin | Derived from auth profile |
| `/manage-sms-wallet` | POST | SMS Wallets | church_admin, branch_admin | Derived from auth profile |
| `/initiate-sms-payment` | POST | SMS Purchases | church_admin, branch_admin | Derived from auth profile |
| `/resend-failed-sms` | POST | SMS Jobs | church_admin, branch_admin | Campaign must belong to user's church |
| `/reset-member-pin` | POST | Member Auth | church_admin | Target member must be in same church |
| `/paystack-checkout` | POST | Subscriptions | any authenticated | Derived from auth profile |
| `/self-checkin` | POST | Attendance | public | Scoped via serviceId lookup |

## Security Model

### Defense Layers

1. **Authentication Layer**: JWT validation via Supabase Auth
2. **Authorization Layer**: Role-based access control using `authorizeRequest()`
3. **Tenant Isolation**: All queries scoped to derived `church_id`
4. **Resource Ownership**: Secondary verification for resource-specific operations

### Error Response Strategy

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| No/Invalid Authorization header | 401 | `Unauthorized - No valid authorization header` |
| Invalid/expired JWT | 401 | `Unauthorized - Invalid or expired token` |
| No church association | 403 | `Forbidden - User has no church association` |
| No active roles | 403 | `Forbidden - User has no active roles` |
| Wrong role | 403 | `Forbidden - Requires one of: [roles]` |
| Cross-tenant access | 403 | `Campaign not found or access denied` |

**Note**: Error messages are intentionally generic to prevent information leakage about resource existence across tenants.

## How to Test

### Automated Tests
```bash
npm run test -- src/test/security/idor-bola-prevention.test.ts
```

### Manual Testing

#### Test 1: Cross-Tenant Access Prevention
1. Login as Church A admin
2. Note a campaign ID from Church B (if available via direct DB access)
3. Call `resend-failed-sms` with that campaign ID
4. Expected: 403 "Campaign not found or access denied"

#### Test 2: Client-Provided churchId Ignored
1. Login as Church A admin
2. Call `send-sms-campaign` with `churchId: "church-b-id"` in body
3. Verify campaign is created for Church A, not Church B
4. Expected: Campaign.church_id === your actual church ID

#### Test 3: Role Enforcement
1. Login as a user with only "usher" role
2. Call `send-sms-campaign`
3. Expected: 403 "Forbidden - Requires one of: church_admin, branch_admin"

## Architecture Notes

### Why Derive Instead of Validate?

We chose to **derive** `churchId` from the authenticated user's profile rather than **validate** a client-provided `churchId` because:

1. **Simpler**: No need to check if provided ID matches user's church
2. **Safer**: Cannot be bypassed by clever parameter manipulation
3. **Consistent**: Same pattern works for all functions
4. **Defensive**: Even if client code has bugs, server remains secure

### Service Role Usage

The service role key is used to:
- Query `profiles` table (bypasses RLS to get church_id)
- Query `user_roles` table (bypasses RLS to get permissions)
- Perform authorized operations on verified resources

The service role key is **NOT** used to:
- Trust client-provided tenant IDs
- Skip ownership verification
- Bypass role requirements

## Files Changed Summary

| File | Type | Change |
|------|------|--------|
| `supabase/functions/_shared/authorization.ts` | NEW | Shared authorization utilities |
| `supabase/functions/send-sms-campaign/index.ts` | MODIFIED | Added authorization, derived tenant IDs |
| `supabase/functions/manage-sms-wallet/index.ts` | MODIFIED | Added authorization, derived tenant IDs |
| `supabase/functions/initiate-sms-payment/index.ts` | MODIFIED | Added authorization, derived tenant IDs |
| `supabase/functions/resend-failed-sms/index.ts` | MODIFIED | Added authorization, derived tenant IDs |
| `src/test/security/idor-bola-prevention.test.ts` | NEW | Security tests |
| `docs/IDOR_BOLA_SECURITY.md` | NEW | This documentation |
