import { createClient } from '@/lib/supabase/server';
import { SyncControls } from '@/components/admin/SyncControls';
import { LogoutButton } from '@/components/LogoutButton';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const revalidate = 0;

export default async function SyncPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/admin/login');
    }

    return (
        <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-primary font-serif">Manual Data Sync</h1>
                </div>
                <LogoutButton variant="outline" size="sm" />
            </div>

            <SyncControls />
        </main>
    );
}
