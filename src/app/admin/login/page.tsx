import { LoginForm } from '@/components/admin/LoginForm';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
    // Check if user is already logged in
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin_auth')?.value;

    if (adminAuth) {
        try {
            // Validate cookie format
            if (!adminAuth.includes(':')) {
                // Invalid cookie format, delete it
                cookieStore.delete('admin_auth');
            } else {
                // Verify the auth is valid
                const [username, password] = adminAuth.split(':');

                if (username && password) {
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
                    } else {
                        // Invalid credentials, delete cookie
                        cookieStore.delete('admin_auth');
                    }
                }
            }
        } catch (error) {
            // If any error, delete invalid cookie
            cookieStore.delete('admin_auth');
        }
    }

    return (
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <LoginForm />
        </div>
    );
}
