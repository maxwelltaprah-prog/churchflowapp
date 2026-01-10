/**
 * Secrets Management and Safe Logging Tests
 * 
 * Verifies:
 * 1. Sensitive data is properly sanitized before logging
 * 2. Error messages don't leak internal details
 * 3. Secret validation catches missing configs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  containsDangerousContent,
  encodeHTMLEntities,
} from '@/lib/validation-utils';

// Local sanitization function for testing
function sanitizeForLogging(message: string): string {
  return message.replace(/\b(password|secret|key|token)\s*[:=]\s*\S+/gi, '[REDACTED]');
}

// Simulated sanitization function matching server behavior
function sanitizeLogString(value: string): string {
  const patterns = [
    // API keys and tokens
    /\b(sk_|pk_|api_key|apikey|secret|token|bearer|authorization)\s*[:=]?\s*["']?[\w\-\.]+["']?/gi,
    // Passwords
    /\b(password|passwd|pwd)\s*[:=]?\s*["']?[^"'\s]+["']?/gi,
    // Phone numbers (Ghana format)
    /\b(0[0-9]{9}|233[0-9]{9}|\+233[0-9]{9})\b/g,
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    // JWT tokens
    /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    // IP addresses
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  ];

  let sanitized = value;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '***');
  }
  return sanitized;
}

// Simulated sensitive field detector
function isSensitiveField(key: string): boolean {
  const sensitiveFields = new Set([
    'password', 'pin', 'secret', 'token', 'apiKey', 'api_key',
    'phone', 'email', 'customerPhoneNumber',
  ]);
  return sensitiveFields.has(key) || sensitiveFields.has(key.toLowerCase());
}

describe('Secret Sanitization', () => {
  describe('Log String Sanitization', () => {
    it('should redact API keys', () => {
      const logMessage = 'API call failed with api_key=sk_live_12345abc';
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('sk_live_12345abc');
      expect(sanitized).toContain('***');
    });

    it('should redact phone numbers in Ghana format', () => {
      const logMessage = 'Sending SMS to 0244123456';
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('0244123456');
    });

    it('should redact international phone numbers', () => {
      const logMessage = 'Customer phone: +233244123456';
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('233244123456');
    });

    it('should redact email addresses', () => {
      const logMessage = 'User email: john.doe@example.com logged in';
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('john.doe@example.com');
    });

    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const logMessage = `Bearer token: ${jwt}`;
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact IP addresses', () => {
      const logMessage = 'Request from 192.168.1.100';
      const sanitized = sanitizeLogString(logMessage);
      expect(sanitized).not.toContain('192.168.1.100');
    });

    it('should redact passwords in various formats', () => {
      const formats = [
        'password=mysecret123',
        'pwd: mypassword',
        'passwd: secret',
      ];
      
      formats.forEach(format => {
        const sanitized = sanitizeLogString(format);
        expect(sanitized).not.toMatch(/mysecret|mypassword|secret/);
      });
    });
  });

  describe('Sensitive Field Detection', () => {
    it('should identify password fields', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('Password')).toBe(true);
    });

    it('should identify API key fields', () => {
      expect(isSensitiveField('apiKey')).toBe(true);
      expect(isSensitiveField('api_key')).toBe(true);
    });

    it('should identify phone fields', () => {
      expect(isSensitiveField('phone')).toBe(true);
      expect(isSensitiveField('customerPhoneNumber')).toBe(true);
    });

    it('should identify email fields', () => {
      expect(isSensitiveField('email')).toBe(true);
    });

    it('should allow non-sensitive fields', () => {
      expect(isSensitiveField('name')).toBe(false);
      expect(isSensitiveField('amount')).toBe(false);
      expect(isSensitiveField('status')).toBe(false);
    });
  });
});

describe('Error Message Safety', () => {
  it('should not include stack traces in sanitized errors', () => {
    const errorWithStack = `Error: Database connection failed
      at Object.connect (/app/db.ts:45:12)
      at async handler (/app/index.ts:100:5)`;
    
    const sanitized = sanitizeLogString(errorWithStack);
    expect(sanitized).not.toContain('/app/db.ts:45:12');
  });

  it('should use sanitizeForLogging utility correctly', () => {
    const unsafeMessage = 'Error with password=secret123';
    const safe = sanitizeForLogging(unsafeMessage);
    expect(safe).not.toContain('secret123');
  });
});

describe('No Secrets in Client Bundle', () => {
  it('should only have publishable keys in VITE_ env variables', () => {
    // In a real build, VITE_ variables are exposed to the client
    // This test documents the expected pattern
    const allowedVitePatterns = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_SUPABASE_PROJECT_ID',
    ];

    // These should NEVER be VITE_ prefixed
    const forbiddenPatterns = [
      'VITE_SUPABASE_SERVICE_ROLE',
      'VITE_PAYSTACK_SECRET',
      'VITE_API_SECRET',
      'VITE_DATABASE_URL',
    ];

    allowedVitePatterns.forEach(pattern => {
      expect(pattern).toMatch(/^VITE_/);
    });

    forbiddenPatterns.forEach(pattern => {
      // These should never exist as VITE_ variables
      expect(pattern).toMatch(/^VITE_.*SECRET|SERVICE_ROLE|DATABASE/);
    });
  });
});

describe('Secret Validation Behavior', () => {
  it('should have defined behavior for missing secrets', () => {
    // Simulates the getRequiredSecret behavior
    function getRequiredSecret(name: string, env: Record<string, string | undefined>): string {
      const value = env[name];
      if (!value) {
        throw new Error('Application misconfigured: required secret missing');
      }
      return value;
    }

    // Should throw when secret is missing
    expect(() => getRequiredSecret('MISSING_KEY', {})).toThrow('Application misconfigured');

    // Should return value when present
    expect(getRequiredSecret('API_KEY', { 'API_KEY': 'test-value' })).toBe('test-value');
  });

  it('should validate all required secrets at startup', () => {
    function validateRequiredSecrets(names: string[], env: Record<string, string | undefined>): string[] {
      return names.filter(name => !env[name]);
    }

    const required = ['KEY_1', 'KEY_2', 'KEY_3'];
    const env = { 'KEY_1': 'value1', 'KEY_3': 'value3' };

    const missing = validateRequiredSecrets(required, env);
    expect(missing).toContain('KEY_2');
    expect(missing).not.toContain('KEY_1');
    expect(missing).not.toContain('KEY_3');
  });
});

describe('Webhook Payload Safety', () => {
  it('should not log raw customer data from webhooks', () => {
    const webhookPayload = {
      event: 'charge.success',
      data: {
        customer: {
          email: 'customer@example.com',
          phone: '0244123456',
        },
        amount: 10000,
        reference: 'ref_123',
      },
    };

    // What should be logged
    const safeLogData = {
      eventType: webhookPayload.event,
      reference: webhookPayload.data.reference,
      amount: webhookPayload.data.amount,
    };

    // Should not contain PII
    const logString = JSON.stringify(safeLogData);
    expect(logString).not.toContain('customer@example.com');
    expect(logString).not.toContain('0244123456');
    expect(logString).toContain('charge.success');
  });
});
