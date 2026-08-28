import { createClient } from '@/lib/supabase/server';
import { UserList } from '@/components/UserList';
import { User } from '@/types';
import { Suspense } from 'react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function HomeContent() {
  const supabase = await createClient();

  // The get_total_payment_amount RPC used to be called here and its result
  // never read - the Header fetches that figure itself.
  const usersResult = await supabase
    .from('user_list')
    .select('*')
    .order('bakaya_month', { ascending: true })
    .order('name', { ascending: true });

  if (usersResult.error) {
    console.error('Error fetching users:', usersResult.error);
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load users. Please try again later.
      </div>
    );
  }

  const sortedUsers = [...(usersResult.data as User[])].sort((a, b) => {
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
      <Suspense fallback={
        <div className="flex flex-col h-full space-y-4">
          <div className="h-10 rounded-lg relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear'
            }} />
          </div>
          <div className="h-5 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear'
            }} />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pb-24">
            <CardSkeleton count={6} />
          </div>
        </div>
      }>
        <HomeContent />
      </Suspense>
    </main>
  );
}
