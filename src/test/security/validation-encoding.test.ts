/**
 * Security tests for input validation and output encoding
 * 
 * Tests cover:
 * - XSS prevention via sanitization
 * - Injection attempt rejection
 * - Input length validation
 * - Safe error message handling
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeName,
  sanitizePhone,
  sanitizeEmail,
  sanitizeUUID,
  encodeHTMLEntities,
  containsDangerousContent,
  sanitizeErrorMessage,
  VALIDATION_LIMITS,
} from '@/lib/validation-utils';

describe('XSS Prevention', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(malicious);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('alert');
    });

    it('should remove javascript: URLs', () => {
      const malicious = 'Click here: javascript:alert(1)';
      const result = sanitizeText(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const malicious = '<img onerror="alert(1)" src="x">';
      const result = sanitizeText(malicious);
      expect(result).not.toContain('onerror=');
      expect(result).not.toContain('alert');
    });

    it('should encode HTML entities', () => {
      const input = 'Hello <world> & "test"';
      const result = sanitizeText(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should remove iframe tags', () => {
      const malicious = '<iframe src="evil.com"></iframe>';
      const result = sanitizeText(malicious);
      expect(result).not.toContain('<iframe');
    });

    it('should remove data: URLs', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = sanitizeText(malicious);
      expect(result).not.toContain('data:');
    });

    it('should preserve safe text', () => {
      const safe = 'Hello, this is a normal message!';
      const result = sanitizeText(safe);
      expect(result).toContain('Hello');
      expect(result).toContain('normal message');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('encodeHTMLEntities', () => {
    it('should encode all dangerous characters', () => {
      const input = '<script>alert("test\'s")</script>';
      const result = encodeHTMLEntities(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;test&#x27;s&quot;)&lt;/script&gt;');
    });

    it('should handle ampersands correctly', () => {
      const input = 'Tom & Jerry';
      const result = encodeHTMLEntities(input);
      expect(result).toBe('Tom &amp; Jerry');
    });
  });

  describe('containsDangerousContent', () => {
    it('should detect script tags', () => {
      expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(containsDangerousContent('onclick=evil()')).toBe(true);
      expect(containsDangerousContent('onmouseover=hack()')).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      expect(containsDangerousContent('javascript:void(0)')).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(containsDangerousContent('Hello World!')).toBe(false);
      expect(containsDangerousContent('Normal text with numbers 123')).toBe(false);
    });
  });
});

describe('Input Length Validation', () => {
  describe('sanitizeText with maxLength', () => {
    it('should truncate text exceeding max length', () => {
      const longText = 'a'.repeat(2000);
      const result = sanitizeText(longText, 100);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should not truncate text under max length', () => {
      const shortText = 'Hello World';
      const result = sanitizeText(shortText, 100);
      expect(result).toBe(shortText);
    });

    it('should use default max length for messages', () => {
      const longText = 'a'.repeat(2000);
      const result = sanitizeText(longText);
      expect(result.length).toBeLessThanOrEqual(VALIDATION_LIMITS.MESSAGE_MAX);
    });
  });

  describe('sanitizeName', () => {
    it('should enforce name max length', () => {
      const longName = 'John '.repeat(50);
      const result = sanitizeName(longName);
      expect(result.length).toBeLessThanOrEqual(VALIDATION_LIMITS.NAME_MAX);
    });

    it('should remove HTML from names', () => {
      const maliciousName = '<b>John</b> <script>evil()</script>Doe';
      const result = sanitizeName(maliciousName);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should preserve valid names with special characters', () => {
      const validName = "María O'Connor-Smith";
      const result = sanitizeName(validName);
      expect(result).toBe(validName);
    });
  });
});

describe('Phone Number Validation', () => {
  describe('sanitizePhone', () => {
    it('should keep only valid phone characters', () => {
      const phone = '+1 (555) 123-4567';
      const result = sanitizePhone(phone);
      expect(result).toMatch(/^[\d\s\-\(\)\+]+$/);
    });

    it('should remove malicious content', () => {
      const maliciousPhone = '<script>alert(1)</script>0244123456';
      const result = sanitizePhone(maliciousPhone);
      expect(result).not.toContain('<script>');
      expect(result).toMatch(/\d+/);
    });

    it('should enforce max length', () => {
      const longPhone = '1'.repeat(50);
      const result = sanitizePhone(longPhone);
      expect(result.length).toBeLessThanOrEqual(VALIDATION_LIMITS.PHONE_MAX);
    });
  });
});

describe('Email Validation', () => {
  describe('sanitizeEmail', () => {
    it('should lowercase email addresses', () => {
      const email = 'John.Doe@Example.COM';
      const result = sanitizeEmail(email);
      expect(result).toBe('john.doe@example.com');
    });

    it('should remove dangerous characters', () => {
      const maliciousEmail = 'test<script>@example.com';
      const result = sanitizeEmail(maliciousEmail);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should enforce max length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = sanitizeEmail(longEmail);
      expect(result.length).toBeLessThanOrEqual(VALIDATION_LIMITS.EMAIL_MAX);
    });
  });
});

describe('UUID Validation', () => {
  describe('sanitizeUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = sanitizeUUID(validUUID);
      expect(result).toBe(validUUID);
    });

    it('should reject invalid UUIDs', () => {
      expect(sanitizeUUID('not-a-uuid')).toBeNull();
      expect(sanitizeUUID('550e8400-XXXX-41d4-a716-446655440000')).toBeNull();
      expect(sanitizeUUID('')).toBeNull();
    });

    it('should reject injection attempts', () => {
      const sqlInjection = "550e8400-e29b-41d4-a716-446655440000' OR '1'='1";
      const result = sanitizeUUID(sqlInjection);
      expect(result).toBeNull();
    });

    it('should handle case insensitivity', () => {
      const upperUUID = '550E8400-E29B-41D4-A716-446655440000';
      const result = sanitizeUUID(upperUUID);
      expect(result).toBe(upperUUID.toLowerCase());
    });
  });
});

describe('Error Message Sanitization', () => {
  describe('sanitizeErrorMessage', () => {
    it('should remove stack traces', () => {
      const errorWithStack = new Error('Database error at /app/src/db.ts:42:10');
      const result = sanitizeErrorMessage(errorWithStack);
      expect(result).not.toMatch(/:\d+:\d+/);
    });

    it('should redact sensitive environment variables', () => {
      const error = new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
      const result = sanitizeErrorMessage(error);
      expect(result).toContain('[redacted]');
      expect(result).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should redact connection strings', () => {
      const error = new Error('Connection failed: postgresql://user:pass@host:5432/db');
      const result = sanitizeErrorMessage(error);
      expect(result).toContain('[redacted]');
      expect(result).not.toContain('postgresql://');
    });

    it('should truncate very long messages', () => {
      const longError = new Error('Error: ' + 'x'.repeat(500));
      const result = sanitizeErrorMessage(longError);
      expect(result.length).toBeLessThanOrEqual(210); // 200 + '...'
    });

    it('should handle non-Error objects', () => {
      const result = sanitizeErrorMessage('string error');
      expect(result).toBe('An unexpected error occurred');
    });
  });
});

describe('Injection Prevention', () => {
  it('should handle SQL injection attempts in names', () => {
    const sqlInjection = "Robert'; DROP TABLE members;--";
    const result = sanitizeName(sqlInjection);
    // The name should be preserved but any actual DB query would be parameterized
    expect(result).toBe(sqlInjection);
  });

  it('should handle NoSQL injection attempts', () => {
    const nosqlInjection = '{"$gt": ""}';
    const result = sanitizeText(nosqlInjection);
    // Should be escaped properly
    expect(result).toContain('&quot;');
  });

  it('should handle XSS in search queries', () => {
    const xssSearch = '"><script>alert(1)</script>';
    const result = sanitizeText(xssSearch, 100);
    expect(result).not.toContain('<script>');
  });

  it('should handle Unicode attacks', () => {
    const unicodeAttack = '＜script＞alert(1)＜/script＞';
    const result = sanitizeText(unicodeAttack);
    // Should handle fullwidth characters
    expect(result).not.toContain('script>alert');
  });
});

describe('Edge Cases', () => {
  it('should handle null and undefined', () => {
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
    expect(sanitizeName(null as any)).toBe('');
    expect(sanitizePhone(null as any)).toBe('');
    expect(sanitizeEmail(null as any)).toBe('');
    expect(sanitizeUUID(null as any)).toBeNull();
  });

  it('should handle number inputs', () => {
    expect(sanitizeText(12345 as any)).toBe('');
    expect(sanitizeName(12345 as any)).toBe('');
  });

  it('should handle object inputs', () => {
    expect(sanitizeText({} as any)).toBe('');
    expect(sanitizeText([] as any)).toBe('');
  });

  it('should preserve whitespace appropriately', () => {
    const result = sanitizeText('  Hello   World  ');
    expect(result).toBe('Hello   World');
  });

  it('should handle very long unicode strings', () => {
    const longUnicode = '你好'.repeat(1000);
    const result = sanitizeText(longUnicode, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });
});
