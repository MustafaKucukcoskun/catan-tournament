import { timingSafeEqual } from 'crypto';

export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a constant-time op to avoid leaking length
    const dummy = Buffer.alloc(32, 0);
    try { timingSafeEqual(dummy, dummy); } catch {}
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}
