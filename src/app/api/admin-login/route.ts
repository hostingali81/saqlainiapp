import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: username,
            password,
        });

        if (error || !data.session) {
            return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
