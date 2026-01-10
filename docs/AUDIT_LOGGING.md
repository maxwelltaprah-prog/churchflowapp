# Audit Logging

This document describes the audit logging system for ChurchFlow, which tracks privileged actions for security and compliance.

## Overview

Audit logs capture who did what, when, and to whom for security-sensitive operations. All audit data is tenant-scoped and accessible only to church administrators.

## Tables

### `audit_logs`

Stores records of privileged actions:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `created_at` | timestamptz | Timestamp of action |
| `actor_id` | uuid | User who performed action |
| `actor_email` | text | Actor's email (for reference) |
| `actor_role` | text | Actor's role at time of action |
| `church_id` | uuid | Tenant context |
| `branch_id` | uuid | Branch context (if applicable) |
| `action` | text | Action type (see below) |
| `resource_type` | text | Type of resource affected |
| `resource_id` | text | ID of affected resource |
| `target_user_id` | uuid | Target user (for user actions) |
| `metadata` | jsonb | Additional context (sanitized) |
| `outcome` | text | success/failure/denied |
| `error_message` | text | Error details (failures only) |
| `ip_address` | text | Masked client IP |
| `user_agent` | text | Client user agent |

### `security_alerts`

Stores security events for monitoring:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `created_at` | timestamptz | Alert timestamp |
| `alert_type` | text | Type of alert |
| `severity` | text | low/medium/high/critical |
| `church_id` | uuid | Affected tenant |
| `description` | text | Alert description |
| `metadata` | jsonb | Additional context |
| `acknowledged` | boolean | Resolution status |

---

## Logged Actions

### Role & Permission Actions

| Action | Description |
|--------|-------------|
| `role.create` | New admin role created |
| `role.update` | Role type changed |
| `role.delete` | Role permanently deleted |
| `role.revoke` | Role deactivated (soft delete) |
| `role.restore` | Deactivated role restored |
| `permission.update` | Permissions modified |
| `permission.menu_update` | Menu access changed |
| `permission.branch_update` | Branch access changed |

### Subscription & Payment Actions

| Action | Description |
|--------|-------------|
| `subscription.create` | New subscription created |
| `subscription.update` | Plan or status changed |
| `subscription.payment_success` | Payment completed |
| `subscription.payment_failed` | Payment failed |
| `sms_credits.purchase` | SMS credits bought |
| `sms_credits.deduct` | SMS credits used |

### Authentication Actions

| Action | Description |
|--------|-------------|
| `auth.login_success` | Successful login |
| `auth.login_failed` | Failed login attempt |
| `auth.rate_limited` | Rate limit triggered |
| `auth.password_reset` | Password reset completed |
| `auth.otp_requested` | OTP sent |
| `auth.otp_verified` | OTP verified |

### Member Actions

| Action | Description |
|--------|-------------|
| `member.create` | New member registered |
| `member.update` | Member data updated |
| `member.delete` | Member deleted |
| `member.approve` | Pending member approved |
| `member.reject` | Pending member rejected |
| `member.pin_reset` | Member PIN reset |

---

## Access Control

Audit logs use Row-Level Security (RLS):

- **Read**: Only `church_admin` can view logs for their church
- **Write**: Only edge functions (via service role) can create entries
- **Immutable**: No update or delete allowed from client

---

## Querying Audit Logs

### From Client (Church Admins Only)

```typescript
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

### Common Queries

```sql
-- Recent role changes
SELECT * FROM audit_logs 
WHERE action LIKE 'role.%' 
ORDER BY created_at DESC 
LIMIT 50;

-- Failed actions
SELECT * FROM audit_logs 
WHERE outcome = 'failure' 
ORDER BY created_at DESC;

-- Actions by specific user
SELECT * FROM audit_logs 
WHERE actor_id = 'user-uuid' 
ORDER BY created_at DESC;

-- Payment events
SELECT * FROM audit_logs 
WHERE resource_type = 'subscription' 
ORDER BY created_at DESC;
```

---

## Security Alerts

Alerts are created for suspicious activity:

| Alert Type | Severity | Trigger |
|------------|----------|---------|
| `rate_limit_triggered` | medium | Rate limit exceeded |
| `auth_failure_spike` | high | Multiple failed logins |
| `permission_denied_spike` | high | Multiple 403 responses |
| `suspicious_pattern` | high | Unusual access patterns |

### Acknowledging Alerts

```typescript
await supabase
  .from('security_alerts')
  .update({ 
    acknowledged: true,
    acknowledged_by: userId,
    acknowledged_at: new Date().toISOString()
  })
  .eq('id', alertId);
```

---

## Data Sanitization

All metadata in audit logs is automatically sanitized:

### Redacted Fields

- Passwords, PINs, secrets
- Phone numbers, emails
- JWT tokens, API keys
- Credit card numbers
- IP addresses (masked to first 2 octets)

### Example

```typescript
// Input
{ email: 'user@test.com', password: 'secret', role: 'admin' }

// Stored in audit log
{ email: '[REDACTED]', password: '[REDACTED]', role: 'admin' }
```

---

## Implementation

### Edge Function Usage

```typescript
import { createAuditLog, logRoleChange } from "../_shared/audit-logging.ts";

// Log a custom action
await createAuditLog({
  actorId: user.id,
  actorEmail: user.email,
  churchId: churchId,
  action: "member.approve",
  resourceType: "member",
  resourceId: memberId,
  outcome: "success",
}, req);

// Log a role change (helper function)
await logRoleChange(
  "role.create",
  { id: actorId, email: actorEmail, role: "church_admin" },
  { userId: targetUserId, roleId: newRoleId, newRole: "branch_admin" },
  churchId,
  "success",
  req
);
```

### Client-Side Logging (via API)

For client-initiated actions that should be logged, the backend edge function handles logging:

```typescript
// In edge function
const authResult = await authorizeRequest(req);
if (authResult.success) {
  // Perform action...
  
  // Log it
  await createAuditLog({
    actorId: authResult.user.userId,
    actorEmail: authResult.user.email,
    actorRole: authResult.user.role,
    churchId: authResult.user.churchId,
    action: "service.create",
    resourceType: "service",
    resourceId: newService.id,
    outcome: "success",
  }, req);
}
```

---

## Retention

Consider implementing a retention policy for audit logs:

```sql
-- Delete logs older than 2 years (run as scheduled job)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## Compliance Notes

- All privileged actions are logged with actor context
- Logs are tenant-isolated via RLS
- Sensitive data is automatically redacted
- Timestamps use UTC timezone
- IP addresses are masked for privacy
