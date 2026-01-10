/**
 * Centralized validation utilities for input sanitization and security
 * 
 * This module provides:
 * - Input sanitization functions
 * - Length and character validation
 * - XSS prevention helpers
 * - Safe text encoding
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALIDATION_LIMITS = {
  // Names and identifiers
  NAME_MAX: 100,
  NAME_MIN: 1,
  
  // Text fields
  DESCRIPTION_MAX: 500,
  NOTES_MAX: 1000,
  MESSAGE_MAX: 1000,
  
  // Contact info
  PHONE_MAX: 20,
  PHONE_MIN: 8,
  EMAIL_MAX: 255,
  
  // IDs
  UUID_LENGTH: 36,
  
  // Misc
  ADDRESS_MAX: 200,
  CODE_MAX: 50,
} as const;

// Characters that are safe for names (letters, spaces, hyphens, apostrophes, periods)
const SAFE_NAME_PATTERN = /^[\\p{L}\\p{M}\\s\\-'.]+$/u;

// Characters that are safe for general text (no script tags or event handlers)
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
  /url\s*\(/gi,
];

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize a string by removing potentially dangerous content
 * Preserves safe characters while removing XSS vectors
 */
export function sanitizeText(input: string, maxLength: number = VALIDATION_LIMITS.MESSAGE_MAX): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Encode HTML entities for any remaining < > & " '
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
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Decode HTML entities (for display purposes only)
 */
export function decodeHTMLEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Sanitize a name field (more restrictive)
 */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove any HTML/script content first
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Enforce length limit
  if (sanitized.length > VALIDATION_LIMITS.NAME_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.NAME_MAX);
  }
  
  return sanitized;
}

/**
 * Sanitize a phone number (digits and common separators only)
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Keep only digits, spaces, hyphens, parentheses, and plus
  let sanitized = input.replace(/[^\\d\\s\\-\\(\\)\\+]/g, '').trim();
  
  if (sanitized.length > VALIDATION_LIMITS.PHONE_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.PHONE_MAX);
  }
  
  return sanitized;
}

/**
 * Normalize a phone number to digits only (for comparison)
 */
export function normalizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/\\D/g, '');
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim().toLowerCase();
  
  // Remove any non-email characters
  sanitized = sanitized.replace(/[<>'";\\s]/g, '');
  
  if (sanitized.length > VALIDATION_LIMITS.EMAIL_MAX) {
    sanitized = sanitized.substring(0, VALIDATION_LIMITS.EMAIL_MAX);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize a UUID
 */
export function sanitizeUUID(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const sanitized = input.trim().toLowerCase();
  
  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  
  if (!uuidPattern.test(sanitized)) return null;
  
  return sanitized;
}

/**
 * Check if a string contains dangerous content
 */
export function containsDangerousContent(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) return true;
  }
  
  return false;
}

// ============================================================================
// ZOD SCHEMA HELPERS
// ============================================================================

/**
 * Create a sanitized string schema with max length
 */
export function sanitizedString(maxLength: number = VALIDATION_LIMITS.MESSAGE_MAX) {
  return z.string()
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform(val => sanitizeText(val, maxLength));
}

/**
 * Create a sanitized name schema
 */
export function sanitizedName(maxLength: number = VALIDATION_LIMITS.NAME_MAX) {
  return z.string()
    .min(VALIDATION_LIMITS.NAME_MIN, 'Name is required')
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform(val => sanitizeName(val));
}

/**
 * Create a phone schema with validation
 */
export function phoneSchema() {
  return z.string()
    .min(VALIDATION_LIMITS.PHONE_MIN, 'Phone number is too short')
    .max(VALIDATION_LIMITS.PHONE_MAX, 'Phone number is too long')
    .transform(val => sanitizePhone(val))
    .refine(val => normalizePhone(val).length >= 9, 'Invalid phone number');
}

/**
 * Create an optional email schema with validation
 */
export function emailSchema() {
  return z.string()
    .email('Invalid email address')
    .max(VALIDATION_LIMITS.EMAIL_MAX)
    .transform(val => sanitizeEmail(val))
    .optional()
    .or(z.literal(''))
    .nullable();
}

/**
 * Create a UUID schema with validation
 */
export function uuidSchema() {
  return z.string()
    .uuid('Invalid ID format')
    .transform(val => sanitizeUUID(val))
    .refine((val): val is string => val !== null, 'Invalid ID format');
}

/**
 * Create an optional UUID schema
 */
export function optionalUuidSchema() {
  return z.string()
    .uuid('Invalid ID format')
    .transform(val => sanitizeUUID(val))
    .optional()
    .nullable();
}

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating SMS message content
 */
export const smsMessageSchema = z.object({
  messageBody: z.string()
    .min(1, 'Message is required')
    .max(VALIDATION_LIMITS.MESSAGE_MAX, `Maximum ${VALIDATION_LIMITS.MESSAGE_MAX} characters`)
    .transform(val => sanitizeText(val, VALIDATION_LIMITS.MESSAGE_MAX)),
  useFirstName: z.boolean().default(false),
});

/**
 * Schema for validating audience selection
 */
export const audienceSchema = z.object({
  audienceType: z.enum(['all_members', 'group', 'individual', 'visitor', 'visitors']),
  audienceGroupIds: z.array(z.string().uuid()).optional(),
  audienceMemberIds: z.array(z.string().uuid()).optional(),
  audienceVisitorIds: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for validating search/filter inputs
 */
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'Search query too long')
    .transform(val => sanitizeText(val, 100))
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Schema for validating date inputs
 */
export const dateSchema = z.string()
  .refine(val => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format');

/**
 * Schema for validating date ranges
 */
export const dateRangeSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Sanitize error messages for client responses (remove sensitive details)
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // List of patterns that might leak sensitive info
    const sensitivePatterns = [
      /at\s+\S+\s+\(\S+:\d+:\d+\)/g, // Stack traces
      /\b(password|secret|key|token|auth)\b/gi, // Sensitive terms in context
      /SUPABASE_\w+/g, // Environment variables
      /postgresql?:\/\/[^\s]+/gi, // Connection strings
      /https?:\/\/[^\s]*key[^\s]*/gi, // URLs with keys
    ];
    
    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[redacted]');
    }
    
    // Keep message reasonably short
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Create a safe error response object
 */
export function createSafeError(error: unknown, defaultMessage: string = 'An error occurred') {
  const message = error instanceof Error ? sanitizeErrorMessage(error) : defaultMessage;
  
  return {
    error: message,
    success: false,
  };
}
