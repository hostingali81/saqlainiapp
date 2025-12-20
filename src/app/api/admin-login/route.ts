import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createHash, timingSafeEqual } from 'crypto';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const supabase = await createClient();

        // Get user from database
        const { data: loginData, error } = await supabase
            .from('login')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !loginData) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Hash password with SHA-256 and verify
        const hashedPassword = createHash('sha256').update(password).digest('hex');

        // Secure comparison
        const userHash = Buffer.from(hashedPassword);
        const dbHash = Buffer.from(loginData.password || '');

        if (userHash.length !== dbHash.length || !timingSafeEqual(userHash, dbHash)) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Set persistent cookie (1 year expiry)
        const cookieStore = await cookies();
        const authData = JSON.stringify({ u: username, p: loginData.password });
        cookieStore.set('admin_auth', authData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 365 // 1 year
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
