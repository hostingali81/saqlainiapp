import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { performSync, isSyncTarget, syncErrors } from '@/lib/sync-logic';

/** Constant-time compare, so the token cannot be guessed from response timing. */
function tokenMatches(given: unknown, expected: string): boolean {
    if (typeof given !== 'string') return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, target } = body; // target is optional (e.g., 'payment')

        console.log(`[REQUEST] Received sync request with target: ${target}`);

        const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN;
        if (!SECRET_TOKEN) {
            console.error('[ERROR] SYNC_SECRET_TOKEN not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        if (!tokenMatches(token, SECRET_TOKEN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // The Google Sheet's Apps Script sends `target: null` for "Force Sync All".
        const syncTarget = target === undefined || target === null || target === '' ? 'all' : target;
        if (!isSyncTarget(syncTarget)) {
            return NextResponse.json({ error: 'Unknown sync target' }, { status: 400 });
        }

        const results = await performSync(syncTarget);
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/', 'layout');

        // A table that failed is recorded in `results`, not thrown - report it.
        const errors = syncErrors(results);
        if (errors.length > 0) {
            return NextResponse.json({ success: false, errors, results }, { status: 500 });
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        // Logged in full; the caller only gets a generic message.
        console.error('Sync Error:', err);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}
