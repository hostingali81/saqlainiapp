import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash, timingSafeEqual } from 'crypto';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const supabase = await createClient();

        const { data: loginData, error } = await supabase
            .from('login')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !loginData) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        const hashedPassword = createHash('sha256').update(password).digest('hex');
        const userHash = Buffer.from(hashedPassword);
        const dbHash = Buffer.from(loginData.password || '');

        if (userHash.length !== dbHash.length || !timingSafeEqual(userHash, dbHash)) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        const authData = JSON.stringify({ u: username, p: loginData.password });
        
        response.cookies.set('admin_auth', authData, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 31536000
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
