import { describe, it, expect } from 'vitest';
import { timingSafeCompare } from '@/lib/auth/password';

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeCompare('secret123', 'secret123')).toBe(true);
  });
  it('returns false for different strings', () => {
    expect(timingSafeCompare('secret', 'wrong')).toBe(false);
  });
  it('returns false for length-only difference', () => {
    expect(timingSafeCompare('abc', 'abcd')).toBe(false);
  });
  it('returns false for empty input vs set password', () => {
    expect(timingSafeCompare('', 'secret')).toBe(false);
  });
});
