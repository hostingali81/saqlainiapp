import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('admin_auth');

        // Redirect to homepage
        return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
    }
}
