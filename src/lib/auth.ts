import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';

/**
 * Server Actions are addressable by their action ID from *any* route, so the
 * `/admin/:path*` proxy matcher does not protect them on its own.
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

    // A session alone used to be enough - see admin-access.ts for why it is not.
    if (!isAdminUser(user)) {
        return { error: 'This account does not have admin access.' };
    }

    return { userId: user.id };
}
