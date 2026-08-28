import { createClient } from '@/lib/supabase/server';

/**
 * Server Actions are addressable by their action ID from *any* route, so the
 * `/admin/:path*` middleware matcher does not protect them on its own.
 * Every admin-only action must gate itself with this.
 *
 * Especially important for the Google Sheets actions: those run through a
 * service account, so Supabase RLS gives them no protection at all.
 */
export async function requireAdmin(): Promise<{ error: string } | { userId: string }> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { error: 'Unauthorized. Please log in again.' };
    }

    return { userId: user.id };
}
