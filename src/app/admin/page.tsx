import { createClient } from '@/lib/supabase/server';
import { SmartEntryForm } from '@/components/SmartEntryForm';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Camera } from 'lucide-react';

export const revalidate = 0;

export default async function AdminPage() {
    const supabase = await createClient();

    // Check authentication
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin_auth')?.value;

    if (!adminAuth) {
        redirect('/admin/login');
    }

    // Verify credentials from database
    const [username, password] = adminAuth.split(':');
    const { data: loginData } = await supabase
        .from('login')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (!loginData) {
        redirect('/admin/login');
    }

    // Fetch all users for the dropdown
    const { data: users, error } = await supabase
        .from('user_list')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return <div>Error loading users.</div>;
    }

    // Check for profile images (same logic as homepage)
    const fs = require('fs');
    const path = require('path');

    const usersWithImages = (users as User[]).map(user => {
        const imagePath = path.join(process.cwd(), 'public', 'upload', 'small_image', `${user.id}.jpg`);
        return {
            ...user,
            hasImage: fs.existsSync(imagePath)
        };
    });

    // Calculate total for header
    const { data: totalData } = await supabase.from('payment').select('amount');
    const totalAmount = totalData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return (
        <>
            <Header totalAmount={totalAmount} />
            <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-primary font-serif">Admin Dashboard</h1>
                    <div className="flex gap-2">
                        <Link href="/admin/photos">
                            <Button variant="outline" size="sm">
                                <Camera className="h-4 w-4 mr-2" />
                                Photos
                            </Button>
                        </Link>
                        <form action="/api/admin-logout" method="POST">
                            <Button type="submit" variant="outline" size="sm">Logout</Button>
                        </form>
                    </div>
                </div>

                <SmartEntryForm users={usersWithImages} />
            </main>
        </>
    );
}
