import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const adminAuth = request.cookies.get('admin_auth')?.value;
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
        if (!adminAuth) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    if (pathname === '/admin/login' && adminAuth) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*']
};
