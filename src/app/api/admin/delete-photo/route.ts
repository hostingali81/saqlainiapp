import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
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

        const largeImagePath = path.join(process.cwd(), 'public', 'upload', 'large_image', `${userId}.jpg`);
        const smallImagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${userId}.jpg`);

        if (existsSync(largeImagePath)) {
            await unlink(largeImagePath);
        }
        if (existsSync(smallImagePath)) {
            await unlink(smallImagePath);
        }

        return NextResponse.json({ success: true, message: 'Images deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
