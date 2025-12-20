import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('admin_auth');

        // Redirect to login page using the request origin
        const origin = request.nextUrl.origin;
        return NextResponse.redirect(new URL('/admin/login', origin));
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
    }
}
