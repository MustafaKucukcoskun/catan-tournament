import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-fast)] ease-out disabled:opacity-50 disabled:cursor-not-allowed';
    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
      md: 'h-10 px-4 text-[15px] rounded-[var(--radius-md)]',
    };
    const variants: Record<Variant, string> = {
      primary:
        'bg-[var(--color-accent-ember)] text-[var(--color-fg-primary)] hover:brightness-110 hover:glow-ember',
      secondary:
        'bg-transparent text-[var(--color-accent-ember)] border border-[var(--color-accent-ember)] hover:bg-[var(--color-bg-elevated)]',
      ghost:
        'bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-primary)]',
      destructive:
        'bg-transparent text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[rgba(242,107,94,0.1)]',
    };
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
