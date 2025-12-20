import { createClient } from '@/lib/supabase/server';
import { UserList } from '@/components/UserList';
import { User } from '@/types';
import { readdirSync } from 'fs';
import { join } from 'path';
import { getProfileImages } from '@/lib/image-loader';

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  // Parallel queries for better performance
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

  // Manual sort to match PHP EXACTLY (Regular first)
  const sortedUsers = (usersResult.data as User[]).sort((a, b) => {
    if (a.frequency === 'Regular' && b.frequency !== 'Regular') return -1;
    if (a.frequency !== 'Regular' && b.frequency === 'Regular') return 1;
    return 0;
  });

  // Optimized: Read image directory once (cached)
  const imageSet = await getProfileImages();

  const usersWithImages = sortedUsers.map(user => ({
    ...user,
    hasImage: imageSet.has(`${user.id}.jpg`)
  }));

  const totalAmount = totalResult.data || 0;

  return (
    <main className="container max-w-md mx-auto p-4 h-screen flex flex-col bg-background">
      <UserList initialUsers={usersWithImages} />
    </main>
  );
}
