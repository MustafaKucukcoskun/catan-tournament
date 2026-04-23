import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // Token existence is enough here (no DB call — validated in page/action).
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
