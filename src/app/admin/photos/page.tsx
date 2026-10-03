import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { fetchAllRows } from '@/lib/fetch-all';
import { PhotoManagement } from '@/components/PhotoManagement';
import { User } from '@/types';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';

export const revalidate = 0;

export default async function PhotosPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    // Paged: a plain select stops at 1000 rows and would silently drop members.
    const { rows: users, error } = await fetchAllRows<User>(() => supabase
        .from('user_list')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true }));

    if (error) {
        return <div>Error loading users.</div>;
    }

    // List all files in the small_image folder. Storage listing is capped per
    // call too, so keep paging until a short page comes back.
    const existingImages = new Set<string>();
    const LIST_PAGE = 1000;
    for (let offset = 0; offset < 100 * LIST_PAGE; offset += LIST_PAGE) {
        const { data: fileList } = await supabase
            .storage
            .from('user-photos')
            .list('small_image', {
                limit: LIST_PAGE,
                offset,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (!fileList || fileList.length === 0) break;

        fileList.forEach(file => {
            if (file.name.endsWith('.jpg')) {
                existingImages.add(file.name.replace('.jpg', ''));
            }
        });

        if (fileList.length < LIST_PAGE) break;
    }

    const usersWithImages = users.map(user => {
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
