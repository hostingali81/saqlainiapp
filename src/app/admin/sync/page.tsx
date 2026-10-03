import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { SyncControls } from '@/components/admin/SyncControls';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export const revalidate = 0;

export default async function SyncPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    return (
        <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-primary font-serif">Manual Data Sync</h1>
                <AdminNav />
            </div>

            <SyncControls />
        </main>
    );
}
