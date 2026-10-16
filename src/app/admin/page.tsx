import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { fetchAllRows } from '@/lib/fetch-all';
import { User } from '@/types';
import { redirect } from 'next/navigation';
import { AdminPageClient } from '@/components/admin/AdminPageClient';
import { AdminShell } from '@/components/admin/AdminShell';
import { Notice } from '@/components/admin/ui';

export const revalidate = 0;

export default async function AdminPage() {
    const supabase = await createClient();

    // The admin check and the member list load together (one round trip less).
    // Nothing is rendered until the check has passed.
    const [{ data: { user } }, { rows: users, error }] = await Promise.all([
        supabase.auth.getUser(),
        // Paged: a plain select stops at 1000 rows and would silently drop members.
        fetchAllRows<User>(() => supabase
            .from('user_list')
            .select('*')
            .order('name', { ascending: true })
            .order('id', { ascending: true })),
    ]);

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    if (error) {
        return (
            <AdminShell title="Admin Dashboard">
                <Notice tone="error">Members load nahi ho paaye. Page refresh karke dobara try karein.</Notice>
            </AdminShell>
        );
    }

    const usersWithImages = users.map(user => ({
        ...user,
        hasImage: true
    }));

    return (
        <AdminShell title="Admin Dashboard" subtitle="Member ka payment darj karein aur recent entries dekhein." width="wide">
            <AdminPageClient users={usersWithImages} />
        </AdminShell>
    );
}
