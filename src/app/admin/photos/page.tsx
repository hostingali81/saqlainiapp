import { createClient } from '@/lib/supabase/server';
import { PhotoManagement } from '@/components/PhotoManagement';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

export const revalidate = 0;

export default async function PhotosPage() {
    const supabase = await createClient();

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
        <main className="container max-w-lg mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-primary font-serif">Photo Management</h1>
                </div>
                <LogoutButton variant="outline" size="sm" />
            </div>

            <PhotoManagement users={usersWithImages} />
        </main>
    );
}
