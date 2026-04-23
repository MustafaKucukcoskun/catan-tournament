'use client';
import { useActionState } from 'react';
import { adminLogin } from '@/app/actions/admin';

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLogin, { error: '' });
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 p-8 bg-[var(--color-bg-surface)] hairline rounded-md"
      >
        <h1 className="text-2xl font-[var(--font-display)] text-[var(--color-fg-primary)]">
          Yönetici Girişi
        </h1>
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Şifre"
          className="w-full px-3 py-2 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-md text-[var(--color-fg-primary)]"
        />
        {state?.error && (
          <p className="text-[var(--color-error)] text-sm">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-[var(--color-accent-ember)] rounded-md text-[var(--color-fg-primary)] font-medium hover:glow-ember disabled:opacity-50"
        >
          {pending ? 'Doğrulanıyor...' : 'Giriş'}
        </button>
      </form>
    </div>
  );
}
