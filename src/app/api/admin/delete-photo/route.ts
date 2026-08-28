import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
    try {
        // getSession() reads the cookie without verifying it with the auth
        // server, and this handler goes on to use the service-role key - so the
        // check has to be the verified one.
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const userId = Number(body?.userId);

        // Goes straight into a storage path - integers only.
        if (!Number.isInteger(userId) || userId <= 0) {
            return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
        }

        // Use admin client for storage operations
        const adminClient = createAdminClient();

        const largePath = `large_image/${userId}.jpg`;
        const smallPath = `small_image/${userId}.jpg`;

        // Delete both images. These errors used to be destructured and then
        // ignored, so a failed delete still reported success to the admin.
        const { error: largeError } = await adminClient
            .storage
            .from('user-photos')
            .remove([largePath]);

        const { error: smallError } = await adminClient
            .storage
            .from('user-photos')
            .remove([smallPath]);

        const failure = largeError || smallError;
        if (failure) {
            console.error('Delete error:', failure);
            return NextResponse.json({ error: `Delete failed: ${failure.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Images deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
