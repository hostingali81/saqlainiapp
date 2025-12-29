import { createClient } from '@/lib/supabase/server';
import { PhotoManagement } from '@/components/PhotoManagement';
import { User } from '@/types';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export const revalidate = 0;

export default async function PhotosPage() {
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

    const usersWithImages = (users as User[]).map(user => {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${user.id}.jpg`);
        return {
            ...user,
            hasImage: fs.existsSync(imagePath)
        };
    });

    return (
        <main className="container max-w-lg mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-primary font-serif">Photo Management</h1>
                <AdminNav />
            </div>

            <PhotoManagement users={usersWithImages} />
        </main>
    );
}
