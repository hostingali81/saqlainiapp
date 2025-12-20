import { LoginForm } from '@/components/admin/LoginForm';

export default function AdminLoginPage() {
    return (
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <LoginForm />
        </div>
    );
}
