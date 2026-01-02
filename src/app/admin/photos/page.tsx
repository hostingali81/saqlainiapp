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

    // List all files in the small_image folder
    const { data: fileList, error: storageError } = await supabase
        .storage
        .from('user-photos')
        .list('small_image', {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });

    // Create a Set of user IDs that have images
    const existingImages = new Set<string>();
    if (fileList) {
        fileList.forEach(file => {
            if (file.name.endsWith('.jpg')) {
                const userId = file.name.replace('.jpg', '');
                existingImages.add(userId);
            }
        });
    }

    const usersWithImages = (users as User[]).map(user => {
        return {
            ...user,
            hasImage: existingImages.has(user.id.toString())
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
