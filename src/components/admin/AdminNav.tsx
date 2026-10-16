'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, LayoutDashboard, HandCoins, Receipt, Wallet, RefreshCw, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
    { href: '/admin', label: 'Home', icon: LayoutDashboard, exact: true },
    { href: '/admin/form-chanda', label: 'Chanda', icon: HandCoins },
    { href: '/admin/form-expenses', label: 'Expenses', icon: Receipt },
    { href: '/admin/cash', label: 'Cash', icon: Wallet },
    { href: '/admin/sync', label: 'Sync', icon: RefreshCw },
    { href: '/admin/photos', label: 'Photos', icon: Camera },
];

/**
 * Admin section switcher (rendered once, from admin/layout.tsx).
 *
 * - Every section is always shown, in the same order and the same place; only
 *   the highlight moves. Nothing hides, nothing scrolls, nothing shifts.
 * - Phones: six equal tabs (icon over label) so all fit without sideways scroll.
 *   From `sm`: round pills in a centred row.
 * - A tapped tab shows a spinner at once - these pages read Google Sheets and
 *   can take a moment.
 */
export function AdminNav() {
    const pathname = usePathname();
    // Remembers which page the tap happened on: once the pathname changes the
    // new page has arrived and the spinner is over - no effect needed to reset it.
    const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
    const pending = tap && tap.from === pathname ? tap.href : null;
    const [top, setTop] = useState(0);

    const isActive = (item: typeof ITEMS[number]) =>
        item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

    // On larger screens the bar sticks just under the app header, whatever height it has.
    useEffect(() => {
        const header = document.querySelector('header');
        const update = () => setTop(header ? Math.round(header.getBoundingClientRect().height) : 0);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // No section bar on the login screen.
    if (pathname === '/admin/login') return null;

    return (
        <nav
            aria-label="Admin sections"
            style={{ ['--admin-nav-top' as string]: `${top}px` }}
            className="z-30 -mx-4 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur sm:sticky sm:top-[var(--admin-nav-top)] sm:px-4 sm:py-2.5"
        >
            <ul className="grid grid-cols-6 gap-1 sm:flex sm:justify-center sm:gap-2">
                {ITEMS.map(item => {
                    const active = isActive(item);
                    const loading = pending === item.href && !active;
                    const Icon = item.icon;
                    return (
                        <li key={item.href} className="min-w-0">
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                onClick={() => { if (!active) setTap({ href: item.href, from: pathname }); }}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[11px] font-medium leading-none transition-colors',
                                    'sm:h-10 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-0 sm:text-sm',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    active
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-transparent text-foreground/70 active:bg-muted sm:border-border sm:bg-white sm:hover:bg-muted sm:hover:text-foreground',
                                    loading && 'bg-muted text-foreground'
                                )}
                            >
                                {loading
                                    ? <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
                                    : <Icon className="h-5 w-5 sm:h-4 sm:w-4" />}
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
