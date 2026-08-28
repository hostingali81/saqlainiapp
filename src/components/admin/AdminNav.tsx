'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/LogoutButton';
import { Home, FileText, DollarSign, RefreshCw, Camera } from 'lucide-react';

export function AdminNav() {
    const pathname = usePathname();

    return (
        <div className="flex flex-wrap gap-2">
            {pathname !== '/admin' && (
                <Link href="/admin">
                    <Button variant="outline" size="sm">
                        <Home className="h-4 w-4 mr-2" />
                        Dashboard
                    </Button>
                </Link>
            )}
            {pathname !== '/admin/form-chanda' && (
                <Link href="/admin/form-chanda">
                    <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Chanda
                    </Button>
                </Link>
            )}
            {pathname !== '/admin/form-expenses' && (
                <Link href="/admin/form-expenses">
                    <Button variant="outline" size="sm">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Expenses
                    </Button>
                </Link>
            )}
            {pathname !== '/admin/sync' && (
                <Link href="/admin/sync">
                    <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                    </Button>
                </Link>
            )}
            {pathname !== '/admin/photos' && (
                <Link href="/admin/photos">
                    <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Photos
                    </Button>
                </Link>
            )}
            <LogoutButton variant="outline" size="sm" />
        </div>
    );
}
