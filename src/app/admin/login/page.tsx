import { LoginForm } from '@/components/admin/LoginForm';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
    // Check if user is already logged in
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin_auth')?.value;

    if (adminAuth) {
        // Verify the auth is valid
        const [username, password] = adminAuth.split(':');
        const supabase = await createClient();
        const { data: loginData } = await supabase
            .from('login')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        // If valid credentials, redirect to admin
        if (loginData) {
            redirect('/admin');
        }
    }

    return (
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <LoginForm />
        </div>
    );
}
