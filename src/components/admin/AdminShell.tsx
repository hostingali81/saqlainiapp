import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';

const WIDTHS = {
    /** Single-column pages (sync, photos). */
    md: 'max-w-xl',
    /** Form + list side by side from `lg` (dashboard, chanda, expenses, cash). */
    wide: 'max-w-6xl',
};

/**
 * Page frame inside admin/layout.tsx (which owns the section switcher): title,
 * subtitle and logout. Keeps all pages identical in spacing and heading style.
 * Phone first - everything is one column until `lg`.
 */
export function AdminShell({ title, subtitle, width = 'md', children }: {
    title: string;
    subtitle?: string;
    width?: keyof typeof WIDTHS;
    children: React.ReactNode;
}) {
    return (
        <main className={cn('mx-auto', WIDTHS[width])}>
            <div className="mb-4 mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="font-serif text-2xl font-bold leading-tight text-primary">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm leading-snug text-muted-foreground">{subtitle}</p>}
                </div>
                <LogoutButton variant="outline" size="sm" />
            </div>

            {children}
        </main>
    );
}
