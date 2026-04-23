import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends HTMLAttributes<HTMLDivElement> {
  live?: boolean;
  highlight?: boolean;
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ live, highlight, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-md)] hairline p-4',
        highlight ? 'bg-[var(--color-bg-highlight)]' : 'bg-[var(--color-bg-surface)]',
        live && 'shadow-live animate-breath',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';
