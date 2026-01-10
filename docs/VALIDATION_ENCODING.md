# Validation & Encoding Security Guidelines

This document describes the input validation and output encoding strategy implemented in this application to prevent injection attacks and XSS vulnerabilities.

## Overview

The application uses a defense-in-depth approach:

1. **Client-side validation** - Zod schemas with sanitization transforms
2. **Server-side validation** - Edge function input validation 
3. **Database safety** - Supabase SDK parameterized queries + RLS
4. **Output encoding** - React auto-escaping + explicit HTML entity encoding

## Architecture

### Client-Side (`src/lib/validation-utils.ts`)

Centralized validation utilities for React components:

```typescript
import { sanitizeText, sanitizeName, phoneSchema, uuidSchema } from '@/lib/validation-utils';

// Sanitize user input
const cleanText = sanitizeText(userInput);

// Create validated schemas
const mySchema = z.object({
  name: sanitizedName(),
  phone: phoneSchema(),
  description: sanitizedString(500),
});
```

### Server-Side (`supabase/functions/_shared/validation.ts`)

Edge function validation utilities:

```typescript
import { validateSMSCampaignInput, createErrorResponse } from '../_shared/validation.ts';

// Validate request body
const validation = validateSMSCampaignInput(await req.json());
if (!validation.success) {
  return createErrorResponse(validation.error, corsHeaders);
}

const { messageBody, audienceType } = validation.data;
```

## Security Controls

### 1. Input Sanitization

All user inputs are sanitized to remove:

- `<script>` tags and event handlers
- `javascript:` and `data:` URLs
- `<iframe>`, `<object>`, `<embed>` tags
- CSS `expression()` and `url()` in styles

```typescript
// Dangerous patterns removed
const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  // ... more patterns
];
```

### 2. Length Limits

All text fields have enforced maximum lengths:

| Field Type | Max Length |
|-----------|-----------|
| Name | 100 chars |
| Description | 500 chars |
| Notes/Messages | 1000 chars |
| Phone | 20 chars |
| Email | 255 chars |
| Address | 200 chars |

### 3. Type Validation

- UUIDs are validated against regex pattern
- Emails are validated for format
- Phone numbers are normalized to digits
- Enums are validated against allowed values

### 4. HTML Entity Encoding

All text is encoded before storage/display:

| Character | Encoded As |
|-----------|-----------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

## Query Safety

### Supabase SDK (Safe by Default)

The Supabase JavaScript SDK automatically parameterizes all queries:

```typescript
// SAFE: Parameterized automatically
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('church_id', churchId)
  .eq('id', memberId);

// SAFE: RPC calls with parameters
const { data } = await supabase.rpc('get_menu_permissions', {
  _user_id: userId,
  _church_id: churchId,
});
```

### What NOT to Do

```typescript
// NEVER: Raw SQL concatenation (not possible with Supabase SDK anyway)
// NEVER: Accept arbitrary filter objects from client without validation
// NEVER: Use eval() or new Function() with user input
```

## XSS Prevention

### React Auto-Escaping (Default)

React automatically escapes all JSX interpolations:

```tsx
// SAFE: React escapes this automatically
<p>{user.name}</p>
<span>{message.content}</span>
```

### Dangerous HTML (Avoid)

Never use `dangerouslySetInnerHTML` with user content:

```tsx
// DANGEROUS: Never do this with user input
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// SAFE: Only for static/controlled content
<style dangerouslySetInnerHTML={{ __html: cssVariables }} />
```

### Rich Text (If Needed)

If rich text is required in the future, implement:

1. Server-side HTML sanitization with allowlist
2. Use a library like DOMPurify
3. Restrict allowed tags to safe subset (p, b, i, em, strong, a)

## Error Handling

### Safe Error Messages

Never expose internal details to clients:

```typescript
// SAFE: Sanitized error response
return createErrorResponse(error, corsHeaders);

// SAFE: Generic message for unknown errors
catch (error) {
  console.error('Internal error:', error); // Log full details server-side
  return new Response(
    JSON.stringify({ error: 'An error occurred' }), // Generic to client
    { status: 500 }
  );
}
```

### Error Message Sanitization

The `sanitizeErrorMessage()` function removes:

- Stack traces
- Environment variable names
- Connection strings
- API keys and tokens

## Files Changed

### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/validation-utils.ts` | Client-side validation utilities |
| `supabase/functions/_shared/validation.ts` | Server-side validation utilities |
| `src/test/security/validation-encoding.test.ts` | Security tests |
| `docs/VALIDATION_ENCODING.md` | This documentation |

### Existing Patterns Used

| File | Pattern |
|------|---------|
| `src/lib/member-form-schema.ts` | Zod schema with length limits |
| `src/hooks/useChurchMutations.ts` | Parameterized Supabase queries |
| `supabase/functions/send-sms-campaign/index.ts` | Authorized request handling |

## Testing

### Run Validation Tests

```bash
# Run all security tests
npm run test -- src/test/security/validation-encoding.test.ts

# Run with coverage
npm run test -- --coverage src/test/security/
```

### Test Coverage

The test suite covers:

- ✅ XSS payload rejection (script tags, event handlers, javascript: URLs)
- ✅ Injection attempt handling (SQL, NoSQL patterns)
- ✅ Length limit enforcement
- ✅ Type validation (UUID, email, phone)
- ✅ Error message sanitization
- ✅ Edge cases (null, undefined, objects, unicode)

### Manual Testing

1. **XSS Test**: Enter `<script>alert(1)</script>` in any text field
2. **Injection Test**: Enter `'; DROP TABLE members;--` in search
3. **Length Test**: Paste >1000 characters in a notes field
4. **UUID Test**: Try accessing `/member/invalid-uuid`

## Best Practices Checklist

When adding new features:

- [ ] Use Zod schemas with `sanitizedString()` or `sanitizedName()` transforms
- [ ] Validate UUIDs with `uuidSchema()` or `validateUUID()`
- [ ] Set explicit `maxLength` on form inputs
- [ ] Use `createErrorResponse()` for edge function errors
- [ ] Never use `dangerouslySetInnerHTML` with user content
- [ ] Add tests for any new input handling

## Security Considerations

### What's Protected

- ✅ All user text inputs are sanitized
- ✅ All database queries are parameterized
- ✅ Error messages don't leak sensitive info
- ✅ React auto-escapes JSX output

### Remaining Considerations

1. **File Uploads**: The `service-uploads` bucket uses storage policies; ensure file types are validated
2. **Rich Text**: Not currently used; if added, implement DOMPurify
3. **URL Parameters**: Validated where used (UUIDs, enums)

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
