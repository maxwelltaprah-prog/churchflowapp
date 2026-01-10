/**
 * Secure file validation utilities for Edge Functions
 * Implements defense-in-depth file upload security
 */

/**
 * Allowed file configurations by upload type
 */
export const FILE_CONFIGS = {
  program: {
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB for programs
    magicBytes: {
      "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
      "image/jpeg": [0xFF, 0xD8, 0xFF],
      "image/png": [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    },
  },
  sermon_audio: {
    allowedMimeTypes: ["audio/mpeg", "audio/mp3"],
    allowedExtensions: [".mp3"],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB for audio
    magicBytes: {
      "audio/mpeg": [0xFF, 0xFB], // MP3 frame sync (or ID3 tag)
    },
  },
} as const;

export type UploadType = keyof typeof FILE_CONFIGS;

/**
 * Blocked file extensions (executables, scripts, etc.)
 * Always reject these regardless of MIME type
 */
export const BLOCKED_EXTENSIONS = [
  // Executables
  ".exe", ".dll", ".com", ".bat", ".cmd", ".msi", ".scr", ".pif",
  // Scripts
  ".js", ".jsx", ".ts", ".tsx", ".vbs", ".vbe", ".wsf", ".wsh", ".ps1", ".psm1",
  ".sh", ".bash", ".zsh", ".fish", ".csh", ".ksh",
  // Web files that can execute
  ".html", ".htm", ".xhtml", ".svg", ".php", ".asp", ".aspx", ".jsp", ".cgi",
  // Other dangerous formats
  ".jar", ".class", ".py", ".rb", ".pl", ".lua",
  ".app", ".dmg", ".pkg", ".deb", ".rpm",
  ".hta", ".inf", ".reg", ".lnk", ".url",
];

/**
 * Validate file extension against allowed and blocked lists
 */
export function validateExtension(
  fileName: string,
  uploadType: UploadType
): { valid: boolean; error?: string } {
  const ext = getFileExtension(fileName).toLowerCase();
  
  // Always block dangerous extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type "${ext}" is not allowed for security reasons` };
  }
  
  const config = FILE_CONFIGS[uploadType];
  const allowedExts = config.allowedExtensions as readonly string[];
  if (!allowedExts.includes(ext)) {
    return { 
      valid: false, 
      error: `Invalid file extension. Allowed: ${allowedExts.join(", ")}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate MIME type against allowed list
 */
export function validateMimeType(
  mimeType: string,
  uploadType: UploadType
): { valid: boolean; error?: string } {
  const config = FILE_CONFIGS[uploadType];
  const allowedMimes = config.allowedMimeTypes as readonly string[];
  
  if (!allowedMimes.includes(mimeType)) {
    return { 
      valid: false, 
      error: `Invalid file type "${mimeType}". Allowed: ${allowedMimes.join(", ")}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size against limits
 */
export function validateFileSize(
  sizeBytes: number,
  uploadType: UploadType
): { valid: boolean; error?: string } {
  const config = FILE_CONFIGS[uploadType];
  
  if (sizeBytes <= 0) {
    return { valid: false, error: "File is empty" };
  }
  
  if (sizeBytes > config.maxSizeBytes) {
    const maxMB = Math.round(config.maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File exceeds ${maxMB}MB size limit` };
  }
  
  return { valid: true };
}

/**
 * Validate file content by checking magic bytes
 * This verifies the actual file type matches the claimed MIME type
 */
export async function validateMagicBytes(
  fileData: ArrayBuffer,
  claimedMimeType: string,
  uploadType: UploadType
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  const config = FILE_CONFIGS[uploadType];
  const bytes = new Uint8Array(fileData.slice(0, 16));
  
  // Special handling for MP3 which can start with ID3 tag or frame sync
  if (uploadType === "sermon_audio") {
    // Check for ID3 tag (ID3v2)
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return { valid: true, detectedType: "audio/mpeg" };
    }
    // Check for MP3 frame sync (0xFF followed by 0xE* or 0xF*)
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
      return { valid: true, detectedType: "audio/mpeg" };
    }
    return { 
      valid: false, 
      error: "File content does not match MP3 format" 
    };
  }
  
  // Check magic bytes for other types
  const magicBytesConfig = config.magicBytes;
  const expectedMagic = (magicBytesConfig as Record<string, readonly number[]>)[claimedMimeType];
  
  if (!expectedMagic) {
    // No magic bytes check defined for this type
    return { valid: true };
  }
  
  const matchesMagic = expectedMagic.every((byte, index) => bytes[index] === byte);
  
  if (!matchesMagic) {
    // Try to detect actual type
    const magicBytesConfig = config.magicBytes as Record<string, readonly number[]>;
    for (const [mimeType, magic] of Object.entries(magicBytesConfig)) {
      const matches = magic.every((byte, index) => bytes[index] === byte);
      if (matches) {
        return { 
          valid: false, 
          detectedType: mimeType,
          error: `File content (${mimeType}) does not match claimed type (${claimedMimeType})` 
        };
      }
    }
    return { 
      valid: false, 
      error: `File content does not match expected ${claimedMimeType} format` 
    };
  }
  
  return { valid: true, detectedType: claimedMimeType };
}

/**
 * Comprehensive file validation
 * Validates extension, MIME type, size, and optionally magic bytes
 */
export async function validateFile(
  file: { name: string; type: string; size: number; data?: ArrayBuffer },
  uploadType: UploadType
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // 1. Extension check
  const extResult = validateExtension(file.name, uploadType);
  if (!extResult.valid && extResult.error) {
    errors.push(extResult.error);
  }
  
  // 2. MIME type check
  const mimeResult = validateMimeType(file.type, uploadType);
  if (!mimeResult.valid && mimeResult.error) {
    errors.push(mimeResult.error);
  }
  
  // 3. Size check
  const sizeResult = validateFileSize(file.size, uploadType);
  if (!sizeResult.valid && sizeResult.error) {
    errors.push(sizeResult.error);
  }
  
  // 4. Magic bytes check (if data provided)
  if (file.data && errors.length === 0) {
    const magicResult = await validateMagicBytes(file.data, file.type, uploadType);
    if (!magicResult.valid && magicResult.error) {
      errors.push(magicResult.error);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/[/\\\\]/g, "_");
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  
  // Remove leading dots and spaces
  sanitized = sanitized.replace(/^[.\s]+/, "");
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const baseName = sanitized.slice(0, 255 - ext.length);
    sanitized = baseName + ext;
  }
  
  // Default if empty
  if (!sanitized || sanitized === ".") {
    sanitized = "unnamed_file";
  }
  
  return sanitized;
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDot);
}

/**
 * Generate a secure storage path that includes tenant isolation
 */
export function generateSecureStoragePath(
  churchId: string,
  serviceId: string,
  uploadType: UploadType,
  fileName: string
): string {
  // Validate UUIDs to prevent path injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(churchId) || !uuidRegex.test(serviceId)) {
    throw new Error("Invalid ID format");
  }
  
  const sanitizedName = sanitizeFileName(fileName);
  const ext = getFileExtension(sanitizedName).toLowerCase();
  
  // Path format: {churchId}/{serviceId}/{uploadType}{ext}
  // This ensures tenant isolation and prevents overwrites across types
  return `${churchId}/${serviceId}/${uploadType}${ext}`;
}

/**
 * Interface for malware scanning hook
 * Implement this interface to integrate with a malware scanning service
 */
export interface MalwareScanResult {
  clean: boolean;
  threat?: string;
  scannedAt: string;
}

export interface MalwareScanner {
  scan(fileData: ArrayBuffer, fileName: string): Promise<MalwareScanResult>;
}

/**
 * Placeholder malware scanner that logs a warning
 * Replace with actual implementation (e.g., ClamAV, VirusTotal API)
 */
export const placeholderScanner: MalwareScanner = {
  async scan(fileData: ArrayBuffer, fileName: string): Promise<MalwareScanResult> {
    console.warn(
      `[SECURITY] Malware scanning not configured. ` +
      `File "${fileName}" (${fileData.byteLength} bytes) was NOT scanned. ` +
      `Consider integrating ClamAV or VirusTotal API.`
    );
    return {
      clean: true, // Assume clean since we can't scan
      scannedAt: new Date().toISOString(),
    };
  },
};

/**
 * Current malware scanner instance
 * Replace this with an actual scanner implementation in production
 */
export let malwareScanner: MalwareScanner = placeholderScanner;

/**
 * Set the malware scanner implementation
 */
export function setMalwareScanner(scanner: MalwareScanner): void {
  malwareScanner = scanner;
}
