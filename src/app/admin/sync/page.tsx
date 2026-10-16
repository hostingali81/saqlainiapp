import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { SyncControls } from '@/components/admin/SyncControls';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';

export const revalidate = 0;

export default async function SyncPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    return (
        <AdminShell title="Data Sync" subtitle="Google Sheet ka data app ke database mein dobara layein.">
            <SyncControls />
        </AdminShell>
    );
}
