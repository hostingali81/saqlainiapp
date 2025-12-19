'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, IndianRupee, TrendingDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/chanda', label: 'Chanda', icon: IndianRupee },
        { href: '/expenses', label: 'Expenses', icon: TrendingDown },
        { href: '/admin', label: 'Admin', icon: Settings },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 shadow-lg"
            style={{
                background: 'linear-gradient(135deg, #0D483B, #165E4B)',
                borderTop: '3px solid #C6A869'
            }}
        >
            <div className="container max-w-md mx-auto flex justify-around py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg transition-all w-full",
                                isActive
                                    ? "text-[#C6A869]"
                                    : "text-[rgba(255,248,231,0.7)] hover:text-[#C6A869]"
                            )}
                            style={{
                                transform: isActive ? 'translateY(-2px)' : 'none'
                            }}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="text-[11px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
