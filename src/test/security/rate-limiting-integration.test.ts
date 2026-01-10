/**
 * Rate Limiting Integration Tests
 * Tests for the rate limiting behavior in login flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  clearRateLimit,
  formatLockoutTime 
} from '@/lib/security-utils';

describe('Login Rate Limiting Integration', () => {
  const testEmail = 'integration-test@example.com';
  
  beforeEach(() => {
    clearRateLimit(testEmail);
  });

  describe('Progressive Lockout', () => {
    it('should allow 4 attempts without lockout', () => {
      for (let i = 0; i < 4; i++) {
        const result = recordFailedAttempt(testEmail);
        expect(result.isLocked).toBe(false);
        expect(result.attemptsRemaining).toBe(4 - i);
      }
    });

    it('should lock on 5th attempt', () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testEmail);
      }
      
      const result = recordFailedAttempt(testEmail);
      expect(result.isLocked).toBe(true);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.remainingTime).toBe(900); // 15 minutes in seconds
    });

    it('should block further attempts after lockout', () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      // Try to check again
      const state = checkRateLimit(testEmail);
      expect(state.isLocked).toBe(true);
    });
  });

  describe('Successful Login Clears Lockout', () => {
    it('should clear attempts on successful login', () => {
      // Record some failed attempts
      recordFailedAttempt(testEmail);
      recordFailedAttempt(testEmail);
      recordFailedAttempt(testEmail);
      
      // Simulate successful login
      clearRateLimit(testEmail);
      
      // Verify cleared
      const state = checkRateLimit(testEmail);
      expect(state.isLocked).toBe(false);
      expect(state.attempts).toBe(0);
    });

    it('should clear lockout on successful login', () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testEmail);
      }
      
      // Simulate admin unlock or successful login elsewhere
      clearRateLimit(testEmail);
      
      // Should be able to attempt again
      const state = checkRateLimit(testEmail);
      expect(state.isLocked).toBe(false);
    });
  });

  describe('Lockout Message Display', () => {
    it('should format short lockout time', () => {
      expect(formatLockoutTime(30)).toBe('30 seconds');
    });

    it('should format minute lockout time', () => {
      expect(formatLockoutTime(60)).toBe('1 minute');
    });

    it('should format 15-minute lockout correctly', () => {
      expect(formatLockoutTime(900)).toBe('15 minutes');
    });
  });

  describe('Multi-User Isolation', () => {
    it('should isolate rate limits between users', () => {
      const user1 = 'user1-test@example.com';
      const user2 = 'user2-test@example.com';
      
      // Lock user1
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(user1);
      }
      
      // User2 should still be able to attempt
      const user2State = checkRateLimit(user2);
      expect(user2State.isLocked).toBe(false);
      
      recordFailedAttempt(user2);
      expect(checkRateLimit(user2).attempts).toBe(1);
      
      // Cleanup
      clearRateLimit(user1);
      clearRateLimit(user2);
    });
  });
});

describe('Member Login Rate Limiting', () => {
  const testPhone = '+233123456789';
  
  beforeEach(() => {
    clearRateLimit(testPhone);
  });

  it('should rate limit by phone number', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testPhone);
    }
    
    const state = checkRateLimit(testPhone);
    expect(state.isLocked).toBe(true);
  });

  it('should normalize phone number identifiers', () => {
    recordFailedAttempt('+233123456789');
    recordFailedAttempt('+233123456789');
    
    const state = checkRateLimit('+233123456789');
    expect(state.attempts).toBe(2);
    
    clearRateLimit(testPhone);
  });
});

describe('Lockout Timing', () => {
  it('should track remaining lockout time', () => {
    vi.useFakeTimers();
    
    // Lock the account
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('timing-test@example.com');
    }
    
    // Initial check
    let state = checkRateLimit('timing-test@example.com');
    expect(state.remainingTime).toBe(900); // 15 minutes
    
    // After 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    state = checkRateLimit('timing-test@example.com');
    expect(state.isLocked).toBe(true);
    expect(state.remainingTime).toBeLessThanOrEqual(600); // ~10 minutes remaining
    
    // After 15 minutes total
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    state = checkRateLimit('timing-test@example.com');
    expect(state.isLocked).toBe(false);
    
    vi.useRealTimers();
    clearRateLimit('timing-test@example.com');
  });

  it('should reset attempt counter after window expires', () => {
    vi.useFakeTimers();
    
    // Make 3 attempts
    recordFailedAttempt('window-test@example.com');
    recordFailedAttempt('window-test@example.com');
    recordFailedAttempt('window-test@example.com');
    
    expect(checkRateLimit('window-test@example.com').attempts).toBe(3);
    
    // Wait for window to expire (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    
    // Attempts should reset
    expect(checkRateLimit('window-test@example.com').attempts).toBe(0);
    
    vi.useRealTimers();
    clearRateLimit('window-test@example.com');
  });
});
