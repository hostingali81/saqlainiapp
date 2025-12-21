import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
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

        const formData = await request.formData();
        const largeImage = formData.get('largeImage') as File;
        const smallImage = formData.get('smallImage') as File;
        const userId = formData.get('userId') as string;

        if (!largeImage || !smallImage || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const largeDir = path.join(process.cwd(), 'public', 'upload', 'large_image');
        const smallDir = path.join(process.cwd(), 'public', 'upload', 'small_image');

        if (!existsSync(largeDir)) {
            await mkdir(largeDir, { recursive: true });
        }
        if (!existsSync(smallDir)) {
            await mkdir(smallDir, { recursive: true });
        }

        const largeBuffer = Buffer.from(await largeImage.arrayBuffer());
        const smallBuffer = Buffer.from(await smallImage.arrayBuffer());

        const largeImagePath = path.join(largeDir, `${userId}.jpg`);
        const smallImagePath = path.join(smallDir, `${userId}.jpg`);

        await writeFile(largeImagePath, largeBuffer);
        await writeFile(smallImagePath, smallBuffer);

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
