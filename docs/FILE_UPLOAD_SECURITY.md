# File Upload Security

This document describes the file upload and download security controls implemented in the application.

## Overview

The application uses Supabase Storage for file uploads, with a single bucket (`service-uploads`) for church programs and sermon audio. Access is strictly controlled through:

1. **Private bucket** - No public access
2. **Row Level Security (RLS)** - Database-level access control
3. **Signed URLs** - Time-limited download links
4. **Multi-layer validation** - Extension, MIME, size, and magic byte checks

## Allowed File Types

### Church Program
| Format | MIME Type | Extension | Max Size |
|--------|-----------|-----------|----------|
| PDF | `application/pdf` | `.pdf` | 10 MB |
| JPEG | `image/jpeg` | `.jpg`, `.jpeg` | 10 MB |
| PNG | `image/png` | `.png` | 10 MB |

### Sermon Audio
| Format | MIME Type | Extension | Max Size |
|--------|-----------|-----------|----------|
| MP3 | `audio/mpeg` | `.mp3` | 50 MB |

## Blocked File Types

The following file types are **always blocked** regardless of claimed MIME type:

- **Executables**: `.exe`, `.dll`, `.com`, `.bat`, `.cmd`, `.msi`, `.scr`, `.pif`, `.app`, `.dmg`, `.pkg`, `.deb`, `.rpm`
- **Scripts**: `.js`, `.jsx`, `.ts`, `.tsx`, `.vbs`, `.vbe`, `.wsf`, `.ps1`, `.sh`, `.bash`, `.py`, `.rb`, `.pl`, `.lua`
- **Web files**: `.html`, `.htm`, `.xhtml`, `.svg`, `.php`, `.asp`, `.aspx`, `.jsp`, `.cgi`
- **Other dangerous**: `.jar`, `.class`, `.hta`, `.inf`, `.reg`, `.lnk`, `.url`

## Validation Layers

### 1. Client-Side (First Line of Defense)
- File extension check via `accept` attribute
- MIME type validation
- File size check
- **Location**: `ServiceUploadFields.tsx`, `useServiceUploads.ts`

### 2. Server-Side (Edge Functions)
- Extension validation against allowlist
- MIME type validation
- File size enforcement
- Magic byte verification (content-based type detection)
- Filename sanitization (path traversal prevention)
- **Location**: `_shared/file-validation.ts`

### 3. Storage Layer (Supabase)
- Bucket-level 50MB hard limit
- Private bucket (no public URLs)
- RLS policies for access control

## Storage Security

### Bucket Configuration
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('service-uploads', 'service-uploads', false, 52428800);
```

- **Private**: `public = false` - No direct public access
- **Size Limit**: 50 MB enforced at storage level

### RLS Policies

| Policy | Command | Who | Condition |
|--------|---------|-----|-----------|
| Upload | INSERT | Admins | `role IN ('church_admin', 'branch_admin')` |
| View/Download | SELECT | Admins | `role IN ('church_admin', 'branch_admin')` |
| Delete | DELETE | Admins | `role IN ('church_admin', 'branch_admin')` |
| Download | SELECT | Members | Must have attendance record for service |

### Cross-Tenant Isolation
- Storage paths are structured as `{church_id}/{service_id}/{upload_type}.{ext}`
- All paths include church_id for tenant isolation
- RLS policies verify church membership before access

## Download Security

### Signed URLs
All downloads use time-limited signed URLs:

```typescript
const { data } = await supabase.storage
  .from("service-uploads")
  .createSignedUrl(storagePath, 3600); // 1 hour validity
```

- **Validity**: 1 hour (3600 seconds)
- **Single Use**: URL is regenerated for each download request
- **Authorization Required**: User must pass RLS check to get signed URL

### Self-Checkin Downloads (Unauthenticated)
For users who check in without an app account:

1. **Check-in verification**: Must have valid attendance/visitor record
2. **Service validation**: Upload must belong to the checked-in service
3. **Expiry check**: Upload must not be expired
4. **Signed URL**: Generated server-side with service role

```
POST /functions/v1/self-checkin
{
  "action": "get_download_url",
  "serviceId": "uuid",
  "memberId": "uuid",  // or visitorId
  "uploadId": "uuid"
}
```

## Automatic Cleanup

Files are automatically deleted 48 hours after upload:

1. **Scheduled function**: `cleanup-expired-uploads` runs hourly
2. **Process**:
   - Find uploads where `expires_at < now()` and `is_expired = false`
   - Delete from storage bucket
   - Mark database record as expired
3. **UI filtering**: Expired files hidden from all views

## Malware Scanning

### Current Status
Malware scanning is **not currently integrated** but a hook is provided.

### Integration Interface
```typescript
export interface MalwareScanner {
  scan(fileData: ArrayBuffer, fileName: string): Promise<MalwareScanResult>;
}
```

### Recommended Providers
1. **ClamAV** - Open source, self-hosted
2. **VirusTotal API** - Cloud-based, requires API key
3. **AWS S3 Malware Scanning** - If migrating to S3

### Implementation Steps
1. Set up scanning service (e.g., ClamAV container)
2. Implement `MalwareScanner` interface
3. Call `setMalwareScanner(yourScanner)` at function startup
4. Handle `clean: false` results by rejecting upload

## Security Checklist

### Upload Security
- [x] Private storage bucket
- [x] Extension allowlist
- [x] Extension blocklist (executables/scripts)
- [x] MIME type validation
- [x] File size limits
- [x] Magic byte verification
- [x] Filename sanitization
- [x] Path traversal prevention
- [x] Tenant isolation (church_id in path)
- [ ] Malware scanning (hook provided, integration pending)

### Download Security
- [x] No public bucket access
- [x] Signed URLs (1-hour expiry)
- [x] RLS policies for authorization
- [x] Attendance verification for members
- [x] Service ownership verification
- [x] Expiry enforcement (48-hour window)
- [x] Cross-tenant access blocked

### Lifecycle Security
- [x] Automatic file deletion (48 hours)
- [x] Database record expiry tracking
- [x] Scheduled cleanup function

## Testing

### Unauthorized Download Test
```bash
# Should fail - no auth
curl "https://[project].supabase.co/storage/v1/object/service-uploads/[path]"
# Expected: 401 Unauthorized

# Should fail - wrong tenant
curl -H "Authorization: Bearer [other_church_token]" \
  "https://[project].supabase.co/storage/v1/object/service-uploads/[church_a_path]"
# Expected: 403 Forbidden
```

### Disallowed Type Test
```bash
# Should fail - executable file
curl -X POST -F "file=@malware.exe" \
  "https://[project].supabase.co/storage/v1/object/service-uploads/test"
# Expected: 400 Bad Request - blocked extension
```

### Cross-Tenant Access Test
1. Create uploads in Church A
2. Authenticate as Church B admin
3. Attempt to access Church A's files
4. Expected: 403 Forbidden (RLS blocks access)

## Incident Response

If a malicious file is discovered:

1. **Identify**: Find the file's `storage_path` and `id`
2. **Delete immediately**:
   ```sql
   -- Mark as expired
   UPDATE service_uploads SET is_expired = true WHERE id = '[id]';
   -- Delete from storage (via admin or function)
   ```
3. **Audit**: Check who uploaded and when
4. **Notify**: Inform affected church admins
5. **Review**: Check for similar files from same source

## References

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [File Signature Database](https://www.garykessler.net/library/file_sigs.html)
