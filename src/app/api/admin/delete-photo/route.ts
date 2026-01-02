import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

        // Use admin client for storage operations
        const adminClient = createAdminClient();

        const largePath = `large_image/${userId}.jpg`;
        const smallPath = `small_image/${userId}.jpg`;

        // Delete both images
        const { error: largeError } = await adminClient
            .storage
            .from('user-photos')
            .remove([largePath]);

        const { error: smallError } = await adminClient
            .storage
            .from('user-photos')
            .remove([smallPath]);

        return NextResponse.json({ 
            success: true, 
            message: 'Images deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
