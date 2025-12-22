import { createClient } from '@/lib/supabase/server';
import { SmartEntryForm } from '@/components/SmartEntryForm';
import { PaymentEntriesTable } from '@/components/PaymentEntriesTable';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import Link from 'next/link';
import { Camera, RefreshCw } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { redirect } from 'next/navigation';
import { AdminPageClient } from '@/components/admin/AdminPageClient';

export const revalidate = 0;

export default async function AdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/admin/login');
    }

    const { data: users, error } = await supabase
        .from('user_list')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return <div>Error loading users.</div>;
    }

    const usersWithImages = (users as User[]).map(user => ({
        ...user,
        hasImage: false
    }));

    return (
        <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-primary font-serif">Admin Dashboard</h1>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/admin/sync">
                        <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Sync</span>
                        </Button>
                    </Link>
                    <Link href="/admin/photos">
                        <Button variant="outline" size="sm">
                            <Camera className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Photos</span>
                        </Button>
                    </Link>
                    <LogoutButton variant="outline" size="sm" />
                </div>
            </div>

            <AdminPageClient users={usersWithImages} />
        </main>
    );
}
