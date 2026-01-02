import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const largeImage = formData.get('largeImage') as File;
        const smallImage = formData.get('smallImage') as File;
        const userId = formData.get('userId') as string;

        if (!largeImage || !smallImage || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const largeBuffer = await largeImage.arrayBuffer();
        const smallBuffer = await smallImage.arrayBuffer();

        // Upload Large Image
        const { error: largeError } = await supabase
            .storage
            .from('user-photos')
            .upload(`large_image/${userId}.jpg`, largeBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (largeError) throw largeError;

        // Upload Small Image
        const { error: smallError } = await supabase
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
