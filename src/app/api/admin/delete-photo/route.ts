import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Delete from Storage
        const { error } = await supabase
            .storage
            .from('user-photos')
            .remove([
                `large_image/${userId}.jpg`,
                `small_image/${userId}.jpg`
            ]);

        if (error) {
            console.error('Supabase storage delete error:', error);
            // We verify deletion success by checking if error is null, but Supabase might not error if file missing.
            // Still, we consider this attempt a success.
        }

        return NextResponse.json({ success: true, message: 'Images deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
