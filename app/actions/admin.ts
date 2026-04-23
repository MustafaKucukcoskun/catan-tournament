'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { sha256 } from '@/lib/utils';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function adminLogin(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const password = (formData.get('password') as string) ?? '';
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? 'unknown';
  const ipHash = sha256(ip);
  const sb = getServerClient();

  const { count } = await sb
    .from('admin_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - WINDOW_MS).toISOString());

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { error: 'Çok fazla yanlış deneme. 15 dakika bekleyin.' };
  }

  const expected = process.env.ADMIN_PASSWORD ?? '';
  const success = timingSafeCompare(password, expected);
  await sb.from('admin_login_attempts').insert({ ip_hash: ipHash, success });

  if (!success) return { error: 'Şifre yanlış.' };

  await createSession(ip);
  redirect('/admin');
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}
