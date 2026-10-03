'use server';

import { requireAdmin } from '@/lib/auth';
import { performSync, isSyncTarget, syncErrors } from '@/lib/sync-logic';
import { revalidatePath } from 'next/cache';

export async function triggerSync(target: string) {
    const auth = await requireAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    if (!isSyncTarget(target)) {
        return { success: false, error: 'Unknown sync target.' };
    }

    try {
        const results = await performSync(target);
        revalidatePath('/', 'layout');

        // performSync records a failure per table and keeps going, so it always
        // "returns". Look inside, or a fully failed sync shows up as a success.
        const errors = syncErrors(results);
        if (errors.length > 0) {
            return { success: false, error: errors.join(' | '), results };
        }
        return { success: true, results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
