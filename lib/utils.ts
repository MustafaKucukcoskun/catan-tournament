import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createHash } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
