'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton({ variant = "outline", size = "sm" }: { variant?: any, size?: any }) {
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();

            // Clear all cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            window.location.href = '/admin/login';
        } catch (error) {
            console.error('Logout failed:', error);
            setLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleLogout}
            disabled={loading}
            aria-label="Logout"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="hidden sm:inline">{loading ? 'Logging out...' : 'Logout'}</span>
        </Button>
    );
}
