/**
 * Server-side validation utilities for Supabase Edge Functions
 * 
 * This module provides:
 * - Input sanitization for edge functions
 * - Request body validation
 * - Safe error responses
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALIDATION_LIMITS = {
  NAME_MAX: 100,
  DESCRIPTION_MAX: 500,
  NOTES_MAX: 1000,
  MESSAGE_MAX: 1000,
  PHONE_MAX: 20,
  PHONE_MIN: 8,
  EMAIL_MAX: 255,
  UUID_LENGTH: 36,
  ADDRESS_MAX: 200,
} as const;

// Patterns that indicate potential XSS or injection attempts
const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>/gi,
  /<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<style/gi,
  /<meta/gi,
  /expression\s*\(/gi,
];

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize a string by removing potentially dangerous content
 */
export function sanitizeText(input: unknown, maxLength: number = VALIDATION_LIMITS.MESSAGE_MAX): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Encode HTML entities
  sanitized = encodeHTMLEntities(sanitized);
  
  // Enforce length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Encode HTML entities to prevent XSS
 */
export function encodeHTMLEntities(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize a name field (more restrictive)
 */
export function sanitizeName(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  if (sanitized.length > VALIDATION_LIMITS.NAME_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.NAME_MAX);
  }
  
  return sanitized;
}

/**
 * Sanitize a phone number
 */
export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.replace(/[^\d\s\-\(\)\+]/g, '').trim();
  
  if (sanitized.length > VALIDATION_LIMITS.PHONE_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.PHONE_MAX);
  }
  
  return sanitized;
}

/**
 * Normalize a phone number to digits only
 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim().toLowerCase();
  sanitized = sanitized.replace(/[<>'";\s]/g, '');
  
  if (sanitized.length > VALIDATION_LIMITS.EMAIL_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.EMAIL_MAX);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize a UUID
 */
export function validateUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  
  const sanitized = input.trim().toLowerCase();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  
  if (!uuidPattern.test(sanitized)) return null;
  
  return sanitized;
}

/**
 * Validate an array of UUIDs
 */
export function validateUUIDArray(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  
  const validIds: string[] = [];
  for (const id of input) {
    const validated = validateUUID(id);
    if (validated) {
      validIds.push(validated);
    }
  }
  
  return validIds;
}

/**
 * Check if input contains dangerous content
 */
export function containsDangerousContent(input: string): boolean {
  if (!input) return false;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  
  return false;
}

// ============================================================================
// VALIDATION SCHEMAS (Manual - no Zod in Deno edge functions)
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate SMS campaign request body
 */
export interface SMSCampaignInput {
  audienceType: 'all_members' | 'group' | 'individual' | 'visitor' | 'visitors';
  audienceGroupIds?: string[];
  audienceMemberIds?: string[];
  audienceVisitorIds?: string[];
  visitorPhone?: string;
  visitorName?: string;
  messageBody: string;
  senderName?: string;
  recipientCount?: number;
  useFirstName?: boolean;
}

export function validateSMSCampaignInput(body: unknown): ValidationResult<SMSCampaignInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const input = body as Record<string, unknown>;

  // Validate audienceType
  const validAudienceTypes = ['all_members', 'group', 'individual', 'visitor', 'visitors'];
  if (!validAudienceTypes.includes(input.audienceType as string)) {
    return { success: false, error: 'Invalid audience type' };
  }

  // Validate messageBody
  const messageBody = sanitizeText(input.messageBody, VALIDATION_LIMITS.MESSAGE_MAX);
  if (!messageBody || messageBody.length < 1) {
    return { success: false, error: 'Message is required' };
  }

  // Validate UUID arrays if provided
  let audienceGroupIds: string[] | undefined;
  if (input.audienceGroupIds) {
    audienceGroupIds = validateUUIDArray(input.audienceGroupIds) ?? undefined;
    if (input.audienceGroupIds && !audienceGroupIds) {
      return { success: false, error: 'Invalid group IDs' };
    }
  }

  let audienceMemberIds: string[] | undefined;
  if (input.audienceMemberIds) {
    audienceMemberIds = validateUUIDArray(input.audienceMemberIds) ?? undefined;
    if (input.audienceMemberIds && !audienceMemberIds) {
      return { success: false, error: 'Invalid member IDs' };
    }
  }

  let audienceVisitorIds: string[] | undefined;
  if (input.audienceVisitorIds) {
    audienceVisitorIds = validateUUIDArray(input.audienceVisitorIds) ?? undefined;
    if (input.audienceVisitorIds && !audienceVisitorIds) {
      return { success: false, error: 'Invalid visitor IDs' };
    }
  }

  return {
    success: true,
    data: {
      audienceType: input.audienceType as SMSCampaignInput['audienceType'],
      audienceGroupIds,
      audienceMemberIds,
      audienceVisitorIds,
      visitorPhone: input.visitorPhone ? sanitizePhone(input.visitorPhone) : undefined,
      visitorName: input.visitorName ? sanitizeName(input.visitorName) : undefined,
      messageBody,
      senderName: input.senderName ? sanitizeName(input.senderName) : undefined,
      recipientCount: typeof input.recipientCount === 'number' ? input.recipientCount : undefined,
      useFirstName: typeof input.useFirstName === 'boolean' ? input.useFirstName : false,
    },
  };
}

/**
 * Validate check-in request body
 */
export interface CheckinInput {
  action: string;
  serviceId?: string;
  phone?: string;
  memberCode?: string;
  memberId?: string;
  visitorId?: string;
  selectedId?: string;
  selectedType?: 'member' | 'visitor';
  uploadId?: string;
}

export function validateCheckinInput(body: unknown): ValidationResult<CheckinInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const input = body as Record<string, unknown>;

  if (typeof input.action !== 'string') {
    return { success: false, error: 'Missing action' };
  }

  const validActions = ['get_service', 'checkin', 'visitor_checkin', 'unified_checkin', 'get_downloads', 'get_download_url'];
  if (!validActions.includes(input.action)) {
    return { success: false, error: 'Invalid action' };
  }

  // Validate UUIDs if provided
  let serviceId: string | undefined;
  if (input.serviceId) {
    serviceId = validateUUID(input.serviceId) ?? undefined;
    if (!serviceId) {
      return { success: false, error: 'Invalid service ID' };
    }
  }

  let memberId: string | undefined;
  if (input.memberId) {
    memberId = validateUUID(input.memberId) ?? undefined;
    if (!memberId) {
      return { success: false, error: 'Invalid member ID' };
    }
  }

  let visitorId: string | undefined;
  if (input.visitorId) {
    visitorId = validateUUID(input.visitorId) ?? undefined;
    if (!visitorId) {
      return { success: false, error: 'Invalid visitor ID' };
    }
  }

  let selectedId: string | undefined;
  if (input.selectedId) {
    selectedId = validateUUID(input.selectedId) ?? undefined;
    if (!selectedId) {
      return { success: false, error: 'Invalid selected ID' };
    }
  }

  let uploadId: string | undefined;
  if (input.uploadId) {
    uploadId = validateUUID(input.uploadId) ?? undefined;
    if (!uploadId) {
      return { success: false, error: 'Invalid upload ID' };
    }
  }

  // Validate phone if provided
  let phone: string | undefined;
  if (input.phone) {
    phone = normalizePhone(sanitizePhone(input.phone));
    if (phone.length < 9) {
      return { success: false, error: 'Invalid phone number' };
    }
  }

  // Validate memberCode (phone) if provided
  let memberCode: string | undefined;
  if (input.memberCode) {
    memberCode = normalizePhone(sanitizePhone(input.memberCode));
    if (memberCode.length < 9) {
      return { success: false, error: 'Invalid phone number' };
    }
  }

  // Validate selectedType if provided
  let selectedType: 'member' | 'visitor' | undefined;
  if (input.selectedType) {
    if (input.selectedType !== 'member' && input.selectedType !== 'visitor') {
      return { success: false, error: 'Invalid selected type' };
    }
    selectedType = input.selectedType;
  }

  return {
    success: true,
    data: {
      action: input.action as string,
      serviceId,
      phone,
      memberCode,
      memberId,
      visitorId,
      selectedId,
      selectedType,
      uploadId,
    },
  };
}

/**
 * Validate OTP request body
 */
export interface OTPInput {
  email?: string;
  otp?: string;
  newPassword?: string;
}

export function validateOTPInput(body: unknown): ValidationResult<OTPInput> {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Invalid request body' };
  }

  const input = body as Record<string, unknown>;

  let email: string | undefined;
  if (input.email) {
    email = sanitizeEmail(input.email);
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }
  }

  let otp: string | undefined;
  if (input.otp) {
    if (typeof input.otp !== 'string') {
      return { success: false, error: 'Invalid OTP' };
    }
    // OTP should be 6 digits only
    otp = input.otp.replace(/\D/g, '');
    if (otp.length !== 6) {
      return { success: false, error: 'OTP must be 6 digits' };
    }
  }

  let newPassword: string | undefined;
  if (input.newPassword) {
    if (typeof input.newPassword !== 'string') {
      return { success: false, error: 'Invalid password' };
    }
    // Don't sanitize password (allow special chars) but check length
    if (input.newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    if (input.newPassword.length > 128) {
      return { success: false, error: 'Password too long' };
    }
    newPassword = input.newPassword;
  }

  return {
    success: true,
    data: { email, otp, newPassword },
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Sanitize error messages for client responses
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Remove sensitive patterns
    const sensitivePatterns = [
      /at\s+\S+\s+\(\S+:\d+:\d+\)/g,
      /\b(password|secret|key|token|auth)\b.*?(?=\s|$)/gi,
      /SUPABASE_\w+/g,
      /postgresql?:\/\/[^\s]+/gi,
      /https?:\/\/[^\s]*key[^\s]*/gi,
    ];
    
    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[redacted]');
    }
    
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Create a safe error response
 */
export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  status: number = 400
): Response {
  const message = sanitizeErrorMessage(error);
  
  return new Response(
    JSON.stringify({ error: message, success: false }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}
