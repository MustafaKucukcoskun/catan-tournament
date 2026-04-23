import 'server-only';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getServerClient } from '@/lib/supabase/server';
import { sha256 } from '@/lib/utils';

const SESSION_COOKIE = 'admin_session';
const SESSION_DAYS = 7;

export async function createSession(ipHint: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const sb = getServerClient();
  await sb.from('admin_sessions').insert({
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    ip_hint: ipHint.slice(0, 10),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    const sb = getServerClient();
    await sb.from('admin_sessions').delete().eq('token_hash', sha256(token));
  }
  c.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const sb = getServerClient();
  const { data } = await sb
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', sha256(token))
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

export async function isAuthenticatedByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const sb = getServerClient();
  const { data } = await sb
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', sha256(token))
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}
