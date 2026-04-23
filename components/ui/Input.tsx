import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full px-3 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-[var(--radius-md)]',
        'text-[var(--color-fg-primary)] placeholder:text-[var(--color-fg-muted)]',
        'focus:outline-none focus:border-[var(--color-accent-ember)] focus:ring-2 focus:ring-[rgba(232,93,46,0.45)]',
        'transition-all duration-[var(--duration-fast)] ease-out',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
