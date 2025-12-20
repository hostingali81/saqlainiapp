import { LoginForm } from '@/components/admin/LoginForm';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLoginPage() {
    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-4">
                <LoginForm />
            </div>
        </div>
    );
}
