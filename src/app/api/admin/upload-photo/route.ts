import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        // getSession() reads the cookie without verifying it with the auth
        // server. These handlers then act with the service-role key, so the
        // check has to be the verified one.
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const largeImage = formData.get('largeImage') as File;
        const smallImage = formData.get('smallImage') as File;
        const userIdRaw = formData.get('userId') as string;

        if (!largeImage || !smallImage || !userIdRaw) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // userId is interpolated into a storage path, so it must be a plain
        // positive integer - never arbitrary text.
        const userId = Number(userIdRaw);
        if (!Number.isInteger(userId) || userId <= 0) {
            return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
        }

        for (const [label, file] of [['large', largeImage], ['small', smallImage]] as const) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json(
                    { error: `The ${label} image must be a JPEG, PNG or WebP file.` },
                    { status: 415 }
                );
            }
            if (file.size > MAX_IMAGE_BYTES) {
                return NextResponse.json(
                    { error: `The ${label} image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB).` },
                    { status: 413 }
                );
            }
        }

        const largeBuffer = await largeImage.arrayBuffer();
        const smallBuffer = await smallImage.arrayBuffer();

        // Use admin client for storage operations
        const adminClient = createAdminClient();

        // Upload Large Image
        const { error: largeError } = await adminClient
            .storage
            .from('user-photos')
            .upload(`large_image/${userId}.jpg`, largeBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (largeError) throw largeError;

        // Upload Small Image
        const { error: smallError } = await adminClient
            .storage
            .from('user-photos')
            .upload(`small_image/${userId}.jpg`, smallBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (smallError) throw smallError;

        return NextResponse.json({
            success: true,
            message: 'Images uploaded successfully',
            fileName: `${userId}.jpg`
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
