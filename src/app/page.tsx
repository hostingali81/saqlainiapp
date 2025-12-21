import { createClient } from '@/lib/supabase/server';
import { UserList } from '@/components/UserList';
import { User } from '@/types';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function Home() {
  const supabase = await createClient();

  const [usersResult, totalResult] = await Promise.all([
    supabase
      .from('user_list')
      .select('*')
      .order('bakaya_month', { ascending: true })
      .order('name', { ascending: true }),
    supabase.rpc('get_total_payment_amount')
  ]);

  if (usersResult.error) {
    console.error('Error fetching users:', usersResult.error);
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load users. Please try again later.
      </div>
    );
  }

  const sortedUsers = (usersResult.data as User[]).sort((a, b) => {
    if (a.frequency === 'Regular' && b.frequency !== 'Regular') return -1;
    if (a.frequency !== 'Regular' && b.frequency === 'Regular') return 1;
    return 0;
  });

  const usersWithImages = sortedUsers.map(user => {
    const imagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${user.id}.jpg`);
    return {
      ...user,
      hasImage: existsSync(imagePath)
    };
  });

  const totalAmount = totalResult.data || 0;

  return (
    <main className="container max-w-md mx-auto p-4 h-screen flex flex-col bg-background">
      <UserList initialUsers={usersWithImages} />
    </main>
  );
}
