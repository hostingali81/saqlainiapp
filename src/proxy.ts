import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminUser } from '@/lib/admin-access';

// Next 16 renamed `middleware` to `proxy`; the behaviour is unchanged.
export async function proxy(request: NextRequest) {
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
    // Signed in is not the same as admin - see admin-access.ts.
    const isAdmin = isAdminUser(user);

    // Protect admin routes. /audio-generator lives outside /admin but exposes
    // the same member data, so it is gated here too.
    const isProtected =
        (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
        pathname.startsWith('/audio-generator');

    if (isProtected && !isAdmin) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Redirect to admin if already logged in. Only for admins: a signed-in
    // non-admin would otherwise bounce between /admin and /admin/login forever.
    if (pathname === '/admin/login' && isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/audio-generator/:path*']
};
