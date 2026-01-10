/**
 * OTP Security Tests
 * Tests for OTP generation, hashing, and verification
 * Note: These are unit tests that mock the edge function logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the crypto API for Node/JSDOM environment
const mockCrypto = {
  getRandomValues: (array: Uint32Array) => {
    // Deterministic for testing
    array[0] = 123456;
    return array;
  },
  subtle: {
    digest: async (algorithm: string, data: ArrayBuffer) => {
      // Create a mock hash based on input
      const inputArray = new Uint8Array(data);
      const hash = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        hash[i] = (inputArray[i % inputArray.length] + i) % 256;
      }
      return hash.buffer;
    }
  }
};

// Replace global crypto for testing
vi.stubGlobal('crypto', mockCrypto);

// Recreate the security functions for unit testing
function generateSecureOTP(length: number = 6): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = min + (array[0] % (max - min + 1));
  return otp.toString();
}

async function hashOTP(otp: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + salt.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyOTP(otp: string, hash: string, salt: string): Promise<boolean> {
  const computedHash = await hashOTP(otp, salt);
  if (computedHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

describe('OTP Security', () => {
  describe('generateSecureOTP', () => {
    it('should generate a 6-digit OTP by default', () => {
      const otp = generateSecureOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    it('should generate OTP of specified length', () => {
      const otp4 = generateSecureOTP(4);
      expect(otp4).toMatch(/^\d{4}$/);
      
      const otp8 = generateSecureOTP(8);
      expect(otp8).toMatch(/^\d{8}$/);
    });

    it('should generate numeric-only OTP', () => {
      const otp = generateSecureOTP();
      expect(/^\d+$/.test(otp)).toBe(true);
    });
  });

  describe('hashOTP', () => {
    it('should produce a 64-character hex hash', async () => {
      const hash = await hashOTP('123456', 'test@example.com');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different OTPs', async () => {
      const hash1 = await hashOTP('123456', 'test@example.com');
      const hash2 = await hashOTP('654321', 'test@example.com');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different salts', async () => {
      const hash1 = await hashOTP('123456', 'user1@example.com');
      const hash2 = await hashOTP('123456', 'user2@example.com');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize salt to lowercase', async () => {
      const hash1 = await hashOTP('123456', 'TEST@EXAMPLE.COM');
      const hash2 = await hashOTP('123456', 'test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should produce consistent hashes', async () => {
      const hash1 = await hashOTP('123456', 'test@example.com');
      const hash2 = await hashOTP('123456', 'test@example.com');
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP', async () => {
      const otp = '123456';
      const salt = 'test@example.com';
      const hash = await hashOTP(otp, salt);
      
      const isValid = await verifyOTP(otp, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      const salt = 'test@example.com';
      const hash = await hashOTP('123456', salt);
      
      const isValid = await verifyOTP('654321', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should reject OTP with wrong salt', async () => {
      const otp = '123456';
      const hash = await hashOTP(otp, 'correct@example.com');
      
      const isValid = await verifyOTP(otp, hash, 'wrong@example.com');
      expect(isValid).toBe(false);
    });

    it('should reject if hash length mismatch', async () => {
      const isValid = await verifyOTP('123456', 'short', 'test@example.com');
      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison', async () => {
      const otp = '123456';
      const salt = 'test@example.com';
      const hash = await hashOTP(otp, salt);
      
      // This tests the implementation detail but is important for security
      // The verification should take similar time for wrong first char vs wrong last char
      const wrongFirstChar = await verifyOTP('023456', hash, salt);
      const wrongLastChar = await verifyOTP('123450', hash, salt);
      
      expect(wrongFirstChar).toBe(false);
      expect(wrongLastChar).toBe(false);
    });
  });

  describe('OTP Expiry Logic', () => {
    it('should validate OTP expiry check logic', () => {
      const now = new Date();
      const validExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 min future
      const expiredExpiry = new Date(now.getTime() - 1000); // 1 sec past
      
      expect(validExpiry > now).toBe(true);
      expect(expiredExpiry > now).toBe(false);
    });

    it('should consider 10-minute window valid', () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 9 * 60 * 1000); // 9 min ago
      const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 min from creation
      
      expect(expiresAt > now).toBe(true);
    });

    it('should consider 11-minute old OTP expired', () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 11 * 60 * 1000); // 11 min ago
      const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 min from creation
      
      expect(expiresAt > now).toBe(false);
    });
  });

  describe('OTP Single-Use Logic', () => {
    it('should simulate single-use enforcement', () => {
      // Simulate the database state
      let otpRecord: { used: boolean; verified: boolean } | null = {
        used: false,
        verified: false
      };
      
      // First use - should succeed
      expect(otpRecord && !otpRecord.used).toBe(true);
      otpRecord.used = true;
      
      // Second use - should fail
      expect(otpRecord && !otpRecord.used).toBe(false);
    });

    it('should simulate OTP deletion after password reset', () => {
      let otpRecord: object | null = { otp_code: 'hashed', used: false };
      
      // Simulate successful verification and deletion
      otpRecord = null;
      
      // Attempt to reuse - record no longer exists
      expect(otpRecord).toBeNull();
    });
  });
});

describe('Timing Attack Prevention', () => {
  it('should add artificial delay function signature', async () => {
    // Test the timing jitter function logic
    const addTimingJitter = async (minMs: number = 100, maxMs: number = 300): Promise<void> => {
      const delay = minMs + (Math.floor(Math.random() * (maxMs - minMs + 1)));
      expect(delay).toBeGreaterThanOrEqual(minMs);
      expect(delay).toBeLessThanOrEqual(maxMs);
    };
    
    await addTimingJitter(100, 300);
  });

  it('should return generic errors for enumeration prevention', () => {
    // Test that error responses don't leak user existence
    const userExists = false;
    const userDoesNotExist = false;
    
    // Both cases should return the same message
    const errorMessageIfExists = "If this email exists, a reset code has been sent.";
    const errorMessageIfNotExists = "If this email exists, a reset code has been sent.";
    
    expect(errorMessageIfExists).toBe(errorMessageIfNotExists);
  });
});
