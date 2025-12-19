import { createClient } from '@/lib/supabase/server';
import { UserList } from '@/components/UserList';
import { Header } from '@/components/Header';
import { User } from '@/types';

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  // Fetch users ordered by frequency (Regular first) then name
  const { data: users, error } = await supabase
    .from('user_list')
    .select('*')
    .order('bakaya_month', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load users. Please try again later.
      </div>
    );
  }

  // Manual sort to match PHP EXACTLY (Regular first)
  const sortedUsers = (users as User[]).sort((a, b) => {
    if (a.frequency === 'Regular' && b.frequency !== 'Regular') return -1;
    if (a.frequency !== 'Regular' && b.frequency === 'Regular') return 1;
    return 0; // Preserve existing order (bakaya, name)
  });

  // Check for profile images
  const fs = require('fs');
  const path = require('path');

  const usersWithImages = sortedUsers.map(user => {
    const imagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${user.id}.jpg`);
    return {
      ...user,
      hasImage: fs.existsSync(imagePath)
    };
  });

  // Calculate total payment amount for header
  const { data: totalData } = await supabase
    .from('payment')
    .select('amount');

  const totalAmount = totalData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  return (
    <>
      <Header totalAmount={totalAmount} />
      <main className="container max-w-md mx-auto p-4 h-screen flex flex-col bg-background">
        {/* Removed old header - now using Header component */}

        {/* User List */}
        <UserList initialUsers={usersWithImages} />
      </main>
    </>
  );
}
