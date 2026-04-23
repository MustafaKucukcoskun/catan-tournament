'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ open, onClose, children, title, className }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none'
            )}
          >
            <div
              className={cn(
                'pointer-events-auto bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] hairline-strong',
                'max-w-lg w-full p-6 shadow-2xl',
                className
              )}
            >
              {title && (
                <h2 className="text-xl font-[var(--font-display)] text-[var(--color-fg-primary)] mb-4">
                  {title}
                </h2>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
