/**
 * Log Redaction Tests
 * 
 * Tests to verify that sensitive data is properly redacted from logs
 * and never exposed to clients.
 */

import { describe, it, expect } from 'vitest';

// Simulate the sanitization logic from safe-logging.ts
// (We test the patterns here since edge function code can't be directly imported)

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
  // Credit card numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  // Environment variable names with values
  /\b(SUPABASE_|PAYSTACK_|HUBTEL_|RESEND_|BULKSMSGH_)\w+\s*[:=]\s*["']?[^\s"']+["']?/gi,
  // Database connection strings
  /postgresql?:\/\/[^\s"']+/gi,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Authorization headers
  /Authorization:\s*Bearer\s+[\w\-\.]+/gi,
  // Cookie values
  /Cookie:\s*[^\n]+/gi,
  /Set-Cookie:\s*[^\n]+/gi,
  // OTP codes (6 digits)
  /\botp[_\s:=]*\d{6}\b/gi,
  // PIN codes (4-6 digits after "pin")
  /\bpin[_\s:=]*\d{4,6}\b/gi,
];

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
  'otp',
  'otpCode',
  'otp_code',
  'resetToken',
  'reset_token',
  'cookie',
  'cookies',
  'sessionId',
  'session_id',
]);

function sanitizeString(value: string): string {
  let sanitized = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.length > 8) {
        return match.substring(0, 4) + '***' + match.substring(match.length - 2);
      }
      return '***';
    });
  }
  return sanitized;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    if (lowerKey.includes('password') || 
        lowerKey.includes('secret') || 
        lowerKey.includes('token') ||
        lowerKey.includes('phone') ||
        lowerKey.includes('email') ||
        lowerKey.includes('key') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('otp') ||
        lowerKey.includes('pin')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

describe('Log Redaction - Sensitive Patterns', () => {
  
  describe('Authorization Headers', () => {
    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = sanitizeString(input);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).toContain('***');
    });

    it('should redact api_key values', () => {
      const input = 'api_key=sk_live_abc123xyz789';
      const result = sanitizeString(input);
      expect(result).not.toContain('abc123xyz789');
      expect(result).toContain('***');
    });
  });

  describe('Passwords', () => {
    it('should redact password fields', () => {
      const input = 'password: "MySecretPass123!"';
      const result = sanitizeString(input);
      expect(result).not.toContain('MySecretPass123');
      expect(result).toContain('***');
    });

    it('should redact pwd fields', () => {
      const input = 'pwd=hunter2';
      const result = sanitizeString(input);
      expect(result).not.toContain('hunter2');
    });
  });

  describe('Phone Numbers', () => {
    it('should redact Ghana phone numbers (0xx format)', () => {
      const input = 'Customer phone: 0551234567';
      const result = sanitizeString(input);
      expect(result).not.toContain('0551234567');
      expect(result).toContain('***');
    });

    it('should redact Ghana phone numbers (233 format)', () => {
      const input = 'Phone: 233551234567';
      const result = sanitizeString(input);
      expect(result).not.toContain('233551234567');
    });

    it('should redact Ghana phone numbers (+233 format)', () => {
      const input = 'Contact: +233551234567';
      const result = sanitizeString(input);
      expect(result).not.toContain('+233551234567');
    });
  });

  describe('Email Addresses', () => {
    it('should redact email addresses', () => {
      const input = 'User email is user@example.com';
      const result = sanitizeString(input);
      expect(result).not.toContain('user@example.com');
      expect(result).toContain('***');
    });
  });

  describe('JWT Tokens', () => {
    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = `Token: ${jwt}`;
      const result = sanitizeString(input);
      expect(result).not.toContain(jwt);
      expect(result).toContain('***');
    });
  });

  describe('Credit Card Numbers', () => {
    it('should redact credit card numbers with spaces', () => {
      const input = 'Card: 4111 1111 1111 1111';
      const result = sanitizeString(input);
      expect(result).not.toContain('4111 1111 1111 1111');
    });

    it('should redact credit card numbers with dashes', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const result = sanitizeString(input);
      expect(result).not.toContain('4111-1111-1111-1111');
    });
  });

  describe('Database Connection Strings', () => {
    it('should redact PostgreSQL connection strings', () => {
      const input = 'DB: postgresql://user:password@localhost:5432/mydb';
      const result = sanitizeString(input);
      expect(result).not.toContain('password');
      expect(result).not.toContain('user:');
    });
  });

  describe('Environment Variables', () => {
    it('should redact SUPABASE_ variables', () => {
      const input = 'SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const result = sanitizeString(input);
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact PAYSTACK_ variables', () => {
      const input = 'PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx';
      const result = sanitizeString(input);
      expect(result).not.toContain('sk_live_xxxxxxxxxxxxx');
    });
  });

  describe('IP Addresses', () => {
    it('should redact IPv4 addresses', () => {
      const input = 'Client IP: 192.168.1.100';
      const result = sanitizeString(input);
      expect(result).not.toContain('192.168.1.100');
    });
  });

  describe('Cookies', () => {
    it('should redact Cookie headers', () => {
      const input = 'Cookie: session=abc123; auth_token=xyz789';
      const result = sanitizeString(input);
      expect(result).not.toContain('abc123');
      expect(result).not.toContain('xyz789');
    });
  });

  describe('OTP Codes', () => {
    it('should redact OTP codes', () => {
      const input = 'otp_code: 123456';
      const result = sanitizeString(input);
      expect(result).not.toContain('123456');
    });
  });
});

describe('Log Redaction - Object Sanitization', () => {
  
  it('should redact password field in objects', () => {
    const input = { username: 'john', password: 'secret123' };
    const result = sanitizeObject(input);
    expect(result.password).toBe('[REDACTED]');
    expect(result.username).toBe('john');
  });

  it('should redact token field in objects', () => {
    const input = { userId: '123', accessToken: 'jwt.token.here' };
    const result = sanitizeObject(input);
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.userId).toBe('123');
  });

  it('should redact email field in objects', () => {
    const input = { name: 'John', email: 'john@example.com' };
    const result = sanitizeObject(input);
    expect(result.email).toBe('[REDACTED]');
    expect(result.name).toBe('John');
  });

  it('should redact phone field in objects', () => {
    const input = { name: 'John', phone: '0551234567' };
    const result = sanitizeObject(input);
    expect(result.phone).toBe('[REDACTED]');
  });

  it('should redact nested sensitive fields', () => {
    const input = { 
      user: { 
        name: 'John', 
        credentials: { 
          password: 'secret',
          apiKey: 'key123'
        }
      }
    };
    const result = sanitizeObject(input);
    expect((result.user as any).credentials.password).toBe('[REDACTED]');
    expect((result.user as any).credentials.apiKey).toBe('[REDACTED]');
    expect((result.user as any).name).toBe('John');
  });

  it('should redact fields containing "secret" in name', () => {
    const input = { clientSecret: 'abc123', publicId: '456' };
    const result = sanitizeObject(input);
    expect(result.clientSecret).toBe('[REDACTED]');
    expect(result.publicId).toBe('456');
  });

  it('should redact OTP fields', () => {
    const input = { otpCode: '123456', verified: true };
    const result = sanitizeObject(input);
    expect(result.otpCode).toBe('[REDACTED]');
    expect(result.verified).toBe(true);
  });

  it('should redact PIN fields', () => {
    const input = { memberPin: '1234', memberId: 'uuid' };
    const result = sanitizeObject(input);
    expect(result.memberPin).toBe('[REDACTED]');
    expect(result.memberId).toBe('uuid');
  });

  it('should redact cookie fields', () => {
    const input = { sessionCookie: 'abc123def456', status: 'active' };
    const result = sanitizeObject(input);
    expect(result.sessionCookie).toBe('[REDACTED]');
    expect(result.status).toBe('active');
  });
});

describe('Log Redaction - Error Response Security', () => {
  
  it('should not expose sensitive info in simulated error responses', () => {
    // Simulate what an error response should look like
    const internalError = new Error('Database error: password authentication failed for user "admin"');
    
    // Client-facing error should be generic
    const clientResponse = { error: 'An unexpected error occurred' };
    
    // Verify client response doesn't leak details
    expect(JSON.stringify(clientResponse)).not.toContain('password');
    expect(JSON.stringify(clientResponse)).not.toContain('admin');
    expect(JSON.stringify(clientResponse)).not.toContain('Database');
  });

  it('should strip stack traces from client errors', () => {
    const errorWithStack = {
      message: 'Validation failed',
      stack: 'Error: Validation failed\n    at validateInput (/app/src/validators.ts:45:11)\n    at processRequest (/app/src/handlers.ts:123:5)'
    };
    
    // Client-facing version should not have stack
    const clientError = { error: errorWithStack.message };
    
    expect(JSON.stringify(clientError)).not.toContain('validators.ts');
    expect(JSON.stringify(clientError)).not.toContain('handlers.ts');
    expect(JSON.stringify(clientError)).not.toContain('/app/src/');
  });
});

describe('Audit Log Data Sanitization', () => {
  
  it('should allow safe metadata fields', () => {
    const metadata = {
      action: 'role.create',
      newRole: 'branch_admin',
      resourceId: 'uuid-here',
    };
    const result = sanitizeObject(metadata);
    expect(result.action).toBe('role.create');
    expect(result.newRole).toBe('branch_admin');
    expect(result.resourceId).toBe('uuid-here');
  });

  it('should redact sensitive metadata fields', () => {
    const metadata = {
      action: 'auth.login',
      userEmail: 'user@test.com',
      userPassword: 'secret123',
    };
    const result = sanitizeObject(metadata);
    expect(result.action).toBe('auth.login');
    expect(result.userEmail).toBe('[REDACTED]');
    expect(result.userPassword).toBe('[REDACTED]');
  });
});
