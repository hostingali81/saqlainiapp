import { createClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/fetch-all';
import { UserList } from '@/components/UserList';
import { User } from '@/types';
import { Suspense } from 'react';
import { HomeSkeleton } from '@/components/skeletons/HomeSkeleton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function HomeContent() {
  const supabase = await createClient();

  // The get_total_payment_amount RPC used to be called here and its result
  // never read - the Header fetches that figure itself.
  // Paged: a plain select stops at 1000 rows and would silently drop members.
  const usersResult = await fetchAllRows<User>(() => supabase
    .from('user_list')
    .select('*')
    .order('bakaya_month', { ascending: true })
    .order('name', { ascending: true })
    .order('id', { ascending: true }));

  if (usersResult.error) {
    console.error('Error fetching users:', usersResult.error);
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load users. Please try again later.
      </div>
    );
  }

  const sortedUsers = [...usersResult.rows].sort((a, b) => {
    if (a.frequency === 'Regular' && b.frequency !== 'Regular') return -1;
    if (a.frequency !== 'Regular' && b.frequency === 'Regular') return 1;
    return 0;
  });

  const usersWithImages = sortedUsers.map(user => ({
    ...user,
    hasImage: true
  }));

  return <UserList initialUsers={usersWithImages} />;
}

export default function Home() {
  return (
    <main className="container max-w-md mx-auto p-4 h-screen flex flex-col bg-background">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}
