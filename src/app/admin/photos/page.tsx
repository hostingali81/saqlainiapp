import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { fetchAllRows } from '@/lib/fetch-all';
import { PhotoManagement } from '@/components/PhotoManagement';
import { User } from '@/types';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { Notice } from '@/components/admin/ui';

export const revalidate = 0;

/**
 * Member ids that have a photo: every file in the small_image folder. Storage
 * listing is capped per call too, so keep paging until a short page comes back.
 */
async function listPhotoIds(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Set<string>> {
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
    return existingImages;
}

export default async function PhotosPage() {
    const supabase = await createClient();

    // Admin check, member list and photo listing load together instead of one
    // after another. Nothing is rendered until the check has passed.
    const [{ data: { user } }, { rows: users, error }, existingImages] = await Promise.all([
        supabase.auth.getUser(),
        // Paged: a plain select stops at 1000 rows and would silently drop members.
        fetchAllRows<User>(() => supabase
            .from('user_list')
            .select('*')
            .order('name', { ascending: true })
            .order('id', { ascending: true })),
        listPhotoIds(supabase),
    ]);

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    if (error) {
        return (
            <AdminShell title="Photo Management">
                <Notice tone="error">Members load nahi ho paaye. Page refresh karke dobara try karein.</Notice>
            </AdminShell>
        );
    }

    const usersWithImages = users.map(user => {
        return {
            ...user,
            hasImage: existingImages.has(user.id.toString())
        };
    });

    return (
        <AdminShell title="Photo Management" subtitle="Member ki photo badlein ya hataein.">
            <PhotoManagement users={usersWithImages} />
        </AdminShell>
    );
}
