import { createClient } from '@/lib/supabase/server';
import { PhotoManagement } from '@/components/PhotoManagement';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function PhotosPage() {
    const supabase = await createClient();

    // Check authentication (same as admin page)
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

    // Fetch all users
    const { data: users, error } = await supabase
        .from('user_list')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        return <div>Error loading users.</div>;
    }

    // Check for profile images
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
            <main className="container max-w-lg mx-auto p-4 min-h-screen bg-background pb-24">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/admin">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-primary font-serif">Photo Management</h1>
                    </div>
                    <form action="/api/admin-logout" method="POST">
                        <Button type="submit" variant="outline" size="sm">Logout</Button>
                    </form>
                </div>

                <PhotoManagement users={usersWithImages} />
            </main>
        </>
    );
}
