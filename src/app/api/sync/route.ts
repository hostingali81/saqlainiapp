import { NextRequest, NextResponse } from 'next/server';
import { performSync } from '@/lib/sync-logic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, target } = body; // target is optional (e.g., 'payment')

        console.log(`[REQUEST] Received sync request with target: ${target}`);

        const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || "my-secure-sync-token-123";
        if (token !== SECRET_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const results = await performSync(target);
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/', 'layout');

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
