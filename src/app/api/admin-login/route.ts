import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, clearRateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Throttle by IP so the login form cannot be brute forced.
        const key = clientIp(request);
        const limit = checkRateLimit(key);

        if (!limit.allowed) {
            return NextResponse.json(
                { success: false, error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).` },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: username,
            password,
        });

        if (error || !data.session) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        clearRateLimit(key);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
