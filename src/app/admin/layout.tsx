import { AdminNav } from '@/components/admin/AdminNav';

/**
 * Shared by every /admin page. The section switcher lives here, not inside each
 * page, so it is NOT re-created when you move between sections: the pills keep
 * their place and scroll position and only the highlight moves.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto min-h-screen max-w-6xl bg-background px-4 pb-28">
            <AdminNav />
            {children}
        </div>
    );
}
