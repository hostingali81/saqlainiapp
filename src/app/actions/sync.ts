'use server';

import { createClient } from '@/lib/supabase/server';
import { performSync } from '@/lib/sync-logic';
import { revalidatePath } from 'next/cache';

export async function triggerSync(target: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const results = await performSync(target);
        revalidatePath('/', 'layout');
        return { success: true, results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
