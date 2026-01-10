/**
 * Safe Logging Utilities for Edge Functions
 * 
 * Provides logging functions that automatically sanitize sensitive data
 * to prevent secret leakage in production logs.
 */

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /\b(sk_|pk_|api_key|apikey|secret|token|bearer|authorization|auth)\s*[:=]?\s*["']?[\w\-\.]+["']?/gi,
  // Passwords
  /\b(password|passwd|pwd)\s*[:=]?\s*["']?[^\s"']+["']?/gi,
  // Phone numbers (Ghana format and international)
  /\b(0[0-9]{9}|233[0-9]{9}|\+233[0-9]{9})\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // UUIDs (partial masking)
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  // Credit card numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  // Environment variable names with values
  /\b(SUPABASE_|PAYSTACK_|HUBTEL_|RESEND_|BULKSMSGH_)\w+\s*[:=]\s*["']?[^\s"']+["']?/gi,
  // Database connection strings
  /postgresql?:\/\/[^\s"']+/gi,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Stack traces with file paths
  /at\s+\S+\s+\(([^)]+)\)/g,
  /\/[\w/.-]+\.ts:\d+:\d+/g,
];

// Fields that should never be logged
const SENSITIVE_FIELDS = new Set([
  'password',
  'pin',
  'secret',
  'token',
  'authorization',
  'auth',
  'apiKey',
  'api_key',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'phone',
  'phoneNumber',
  'phone_number',
  'customerPhoneNumber',
  'email',
  'customerEmail',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
]);

/**
 * Sanitize a string by masking sensitive patterns
 */
export function sanitizeLogString(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  let sanitized = value;
  
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Keep first few chars for identification, mask the rest
      if (match.length > 8) {
        return match.substring(0, 4) + '***' + match.substring(match.length - 2);
      }
      return '***';
    });
  }
  
  return sanitized;
}

/**
 * Sanitize an object by removing or masking sensitive fields
 */
export function sanitizeLogObject(obj: unknown, depth: number = 0): unknown {
  // Prevent infinite recursion
  if (depth > 5) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeLogString(obj);
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogObject(item, depth + 1));
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Completely redact sensitive fields
    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Check for sensitive field name patterns
    if (lowerKey.includes('password') || 
        lowerKey.includes('secret') || 
        lowerKey.includes('token') ||
        lowerKey.includes('phone') ||
        lowerKey.includes('email') ||
        lowerKey.includes('key')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively sanitize nested objects
    sanitized[key] = sanitizeLogObject(value, depth + 1);
  }
  
  return sanitized;
}

/**
 * Safe console.log that sanitizes all arguments
 */
export function safeLog(...args: unknown[]): void {
  const sanitizedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeLogString(arg);
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(sanitizeLogObject(arg), null, 2);
      } catch {
        return '[CIRCULAR_OR_UNSERIALIZABLE]';
      }
    }
    return arg;
  });
  
  console.log(...sanitizedArgs);
}

/**
 * Safe console.error that sanitizes all arguments
 */
export function safeError(...args: unknown[]): void {
  const sanitizedArgs = args.map(arg => {
    if (arg instanceof Error) {
      // Sanitize error message and stack
      return {
        name: arg.name,
        message: sanitizeLogString(arg.message),
        // Don't log full stack in production
        stack: Deno.env.get("ENVIRONMENT") === "development" 
          ? sanitizeLogString(arg.stack || '') 
          : undefined,
      };
    }
    if (typeof arg === 'string') {
      return sanitizeLogString(arg);
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(sanitizeLogObject(arg), null, 2);
      } catch {
        return '[CIRCULAR_OR_UNSERIALIZABLE]';
      }
    }
    return arg;
  });
  
  console.error(...sanitizedArgs);
}

/**
 * Log with structured format for better log aggregation
 */
export function structuredLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: Record<string, unknown>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeLogString(message),
    ...(data ? { data: sanitizeLogObject(data) } : {}),
  };
  
  const logFn = level === 'error' ? console.error : 
                level === 'warn' ? console.warn : 
                console.log;
  
  logFn(JSON.stringify(logEntry));
}

/**
 * Check if all required secrets are present
 * Throws an error if any required secret is missing
 */
export function validateRequiredSecrets(secretNames: string[]): void {
  const missing: string[] = [];
  
  for (const name of secretNames) {
    if (!Deno.env.get(name)) {
      missing.push(name);
    }
  }
  
  if (missing.length > 0) {
    // Log which secrets are missing (just names, not values)
    console.error(`Missing required secrets: ${missing.join(', ')}`);
    throw new Error('Application misconfigured: required secrets missing');
  }
}

/**
 * Get a secret with validation
 * Returns the secret value or throws if not set
 */
export function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name);
  
  if (!value) {
    console.error(`Required secret not configured: ${name}`);
    throw new Error('Application misconfigured: required secret missing');
  }
  
  return value;
}
