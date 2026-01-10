/**
 * Security Utils Tests
 * Tests for client-side rate limiting and lockout behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  clearRateLimit, 
  formatLockoutTime 
} from './security-utils';

describe('Security Utils - Rate Limiting', () => {
  const testEmail = 'test@example.com';
  
  beforeEach(() => {
    // Clear rate limit state before each test
    clearRateLimit(testEmail);
  });

  describe('checkRateLimit', () => {
    it('should return unlocked state for new identifier', () => {
      const result = checkRateLimit('new@example.com');
      expect(result.isLocked).toBe(false);
      expect(result.remainingTime).toBe(0);
      expect(result.attempts).toBe(0);
    });

    it('should normalize email case and whitespace', () => {
      recordFailedAttempt('TEST@EXAMPLE.COM ');
      const result = checkRateLimit('test@example.com');
      expect(result.attempts).toBe(1);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempt count on failed login', () => {
      const result1 = recordFailedAttempt(testEmail);
      expect(result1.attemptsRemaining).toBe(4);
      expect(result1.isLocked).toBe(false);
      
      const result2 = recordFailedAttempt(testEmail);
      expect(result2.attemptsRemaining).toBe(3);
    });

    it('should lock account after 5 failed attempts', () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testEmail);
      }
      
      const finalResult = recordFailedAttempt(testEmail);
      expect(finalResult.isLocked).toBe(true);
      expect(finalResult.attemptsRemaining).toBe(0);
      expect(finalResult.remainingTime).toBeGreaterThan(0);
    });

    it('should return locked state after lockout', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      const state = checkRateLimit(testEmail);
      expect(state.isLocked).toBe(true);
      expect(state.remainingTime).toBeGreaterThan(0);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit state on successful login', () => {
      // Record some failed attempts
      for (let i = 0; i < 3; i++) {
        recordFailedAttempt(testEmail);
      }
      
      // Simulate successful login
      clearRateLimit(testEmail);
      
      const result = checkRateLimit(testEmail);
      expect(result.isLocked).toBe(false);
      expect(result.attempts).toBe(0);
    });

    it('should clear lockout on successful login', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      // Clear after successful login elsewhere (e.g., admin unlock)
      clearRateLimit(testEmail);
      
      const result = checkRateLimit(testEmail);
      expect(result.isLocked).toBe(false);
    });
  });

  describe('formatLockoutTime', () => {
    it('should format seconds correctly', () => {
      expect(formatLockoutTime(30)).toBe('30 seconds');
      expect(formatLockoutTime(1)).toBe('1 seconds');
    });

    it('should format minutes correctly', () => {
      expect(formatLockoutTime(60)).toBe('1 minute');
      expect(formatLockoutTime(120)).toBe('2 minutes');
      expect(formatLockoutTime(900)).toBe('15 minutes');
    });

    it('should round up to nearest minute', () => {
      expect(formatLockoutTime(61)).toBe('2 minutes');
      expect(formatLockoutTime(90)).toBe('2 minutes');
    });
  });

  describe('Lockout Expiry', () => {
    it('should reset after lockout duration expires', () => {
      vi.useFakeTimers();
      
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      expect(checkRateLimit(testEmail).isLocked).toBe(true);
      
      // Advance time past lockout duration (15 minutes = 900000ms)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      
      const result = checkRateLimit(testEmail);
      expect(result.isLocked).toBe(false);
      expect(result.attempts).toBe(0);
      
      vi.useRealTimers();
    });

    it('should remain locked before expiry', () => {
      vi.useFakeTimers();
      
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      // Advance time but not enough
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      
      const result = checkRateLimit(testEmail);
      expect(result.isLocked).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Attempt Window Reset', () => {
    it('should reset attempts after window expires', () => {
      vi.useFakeTimers();
      
      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        recordFailedAttempt(testEmail);
      }
      
      expect(checkRateLimit(testEmail).attempts).toBe(3);
      
      // Advance time past attempt window (5 minutes = 300000ms)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
      
      // Next check should show reset
      const result = checkRateLimit(testEmail);
      expect(result.attempts).toBe(0);
      
      vi.useRealTimers();
    });
  });
});

describe('Security Utils - Edge Cases', () => {
  it('should handle concurrent rate limiting for different users', () => {
    const user1 = 'user1@example.com';
    const user2 = 'user2@example.com';
    
    // Lock user1
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(user1);
    }
    
    // Record attempts for user2
    recordFailedAttempt(user2);
    recordFailedAttempt(user2);
    
    expect(checkRateLimit(user1).isLocked).toBe(true);
    expect(checkRateLimit(user2).isLocked).toBe(false);
    expect(checkRateLimit(user2).attempts).toBe(2);
    
    // Cleanup
    clearRateLimit(user1);
    clearRateLimit(user2);
  });

  it('should handle special characters in identifiers', () => {
    const specialEmail = 'test+special@example.com';
    
    recordFailedAttempt(specialEmail);
    expect(checkRateLimit(specialEmail).attempts).toBe(1);
    
    clearRateLimit(specialEmail);
  });

  it('should handle phone numbers as identifiers', () => {
    const phone = '+1234567890';
    
    recordFailedAttempt(phone);
    expect(checkRateLimit(phone).attempts).toBe(1);
    
    clearRateLimit(phone);
  });
});
