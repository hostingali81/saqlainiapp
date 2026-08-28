import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    let response = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return request.cookies.get(name)?.value;
                },
                set(name, value, options) {
                    response.cookies.set({ name, value, ...options });
                },
                remove(name, options) {
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Protect admin routes. /audio-generator lives outside /admin but exposes
    // the same member data, so it is gated here too.
    const isProtected =
        (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
        pathname.startsWith('/audio-generator');

    if (isProtected && !user) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Redirect to admin if already logged in
    if (pathname === '/admin/login' && user) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/audio-generator/:path*']
};
