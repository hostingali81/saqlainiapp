'use client';

/**
 * Small UI kit for the ADMIN screens only. Nothing here is imported by the
 * public pages, so it can change freely without touching what members see.
 */

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ---------- field styling shared by every admin form ---------- */

export const inputCls = 'h-11 rounded-lg border-border bg-white md:h-10';
// text-base on phones: anything under 16px makes iOS zoom the page on focus.
export const textareaCls = 'min-h-[84px] rounded-lg border-border bg-white text-base md:text-sm';
export const selectCls = 'h-11 rounded-lg border-border bg-white text-base md:h-10 md:text-sm';

/* ---------- Panel: the one card style used across admin ---------- */

export function Panel({ title, description, icon: Icon, action, children, className, bodyClassName, flush = false }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    /** No padding on the body - for lists and tables that run edge to edge. */
    flush?: boolean;
}) {
    return (
        // Not overflow-hidden for forms: the searchable dropdowns inside open past the card edge.
        <section className={cn('rounded-2xl border border-border/70 bg-card shadow-sm', flush && 'overflow-hidden', className)}>
            {(title || action) && (
                <header className="flex items-start justify-between gap-3 rounded-t-2xl px-4 sm:px-5 py-3.5 border-b border-border/60 bg-muted/40">
                    <div className="flex items-start gap-2.5 min-w-0">
                        {Icon && (
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                            </span>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
                            {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </header>
            )}
            <div className={cn(flush ? '' : 'p-4 sm:p-5', bodyClassName)}>{children}</div>
        </section>
    );
}

/* ---------- Field: label + control + hint ---------- */

export function Field({ label, required, hint, htmlFor, className, children }: {
    label: React.ReactNode;
    required?: boolean;
    hint?: React.ReactNode;
    htmlFor?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
                {label}
                {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
    );
}

/* ---------- Notice: success / error / warning / info ---------- */

const NOTICE_TONES = {
    success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconCls: 'text-emerald-600' },
    error: { box: 'border-red-200 bg-red-50 text-red-900', icon: AlertCircle, iconCls: 'text-red-600' },
    warning: { box: 'border-amber-300 bg-amber-50 text-amber-900', icon: AlertTriangle, iconCls: 'text-amber-600' },
    info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info, iconCls: 'text-sky-600' },
} as const;

export function Notice({ tone = 'info', children, onClose, className }: {
    tone?: keyof typeof NOTICE_TONES;
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}) {
    const t = NOTICE_TONES[tone];
    const Icon = t.icon;
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm', t.box, className)}>
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.iconCls)} />
            <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
            {onClose && (
                <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-1 rounded p-1 opacity-60 hover:opacity-100">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

/* ---------- Small pieces ---------- */

export function Chip({ tone = 'neutral', children, className }: {
    tone?: 'neutral' | 'green' | 'gold' | 'red';
    children: React.ReactNode;
    className?: string;
}) {
    const tones = {
        neutral: 'bg-muted text-muted-foreground',
        green: 'bg-emerald-100 text-emerald-800',
        gold: 'bg-amber-100 text-amber-900',
        red: 'bg-red-100 text-red-700',
    };
    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', tones[tone], className)}>
            {children}
        </span>
    );
}

/** 40px touch target icon button for row actions (edit / delete). */
export function IconButton({ label, tone = 'default', className, ...props }: React.ComponentProps<'button'> & {
    label: string;
    tone?: 'default' | 'danger';
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            {...props}
            className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
                tone === 'danger' ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-muted hover:text-foreground',
                className
            )}
        />
    );
}

export function EmptyState({ icon: Icon, title, description }: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-10 text-center">
            {Icon && (
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-6 w-6" />
                </span>
            )}
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
        </div>
    );
}

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="divide-y divide-border/60" aria-hidden="true">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-4 py-4">
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
            ))}
        </div>
    );
}

export function SubmitButton({ loading, loadingText = 'Saving...', children, className, ...props }: React.ComponentProps<typeof Button> & {
    loading?: boolean;
    loadingText?: string;
}) {
    return (
        <Button type="submit" size="lg" disabled={loading || props.disabled} className={cn('w-full rounded-lg', className)} {...props}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {loadingText}</> : children}
        </Button>
    );
}

/* ---------- Modal ---------- */

/** Open modals, oldest first - only the newest one reacts to Esc / Tab. */
const modalStack: symbol[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Esc / backdrop closes,
 * the page behind stops scrolling, focus stays inside. Rendered into <body>
 * so it sits above the bottom navigation bar instead of under it.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }: {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    /** While true, Esc / backdrop do not close it (a save is in flight). */
    busy?: boolean;
}) {
    // false while rendering on the server, true in the browser (portals need <body>).
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const me = Symbol('modal');
        modalStack.push(me);

        // Focus the panel itself (no keyboard popping up on phones) unless a
        // control asks for focus with data-autofocus.
        const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
        (first ?? panelRef.current)?.focus({ preventScroll: true });

        function onKeyDown(e: KeyboardEvent) {
            if (modalStack[modalStack.length - 1] !== me) return;
            if (e.key === 'Escape' && !busy) {
                // A Radix select closes itself on Esc; don't close the modal as well.
                if (document.querySelector('[role="listbox"]')) return;
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab' || !panelRef.current) return;
            const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
            if (items.length === 0) return;
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            const at = modalStack.indexOf(me);
            if (at >= 0) modalStack.splice(at, 1);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [open, busy]);

    if (!open || !mounted) return null;

    const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl' };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
                onClick={() => { if (!busy) onClose(); }}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                    'relative flex w-full flex-col bg-card text-card-foreground shadow-2xl outline-none',
                    'max-h-[92dvh] rounded-t-2xl sm:max-h-[88dvh] sm:rounded-2xl animate-slide-up',
                    sizes[size]
                )}
            >
                <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-base font-semibold leading-tight">{title}</h2>
                        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
                    </div>
                    <IconButton label="Close" onClick={onClose} disabled={busy} className="-mr-2 -mt-1.5">
                        <X className="h-4 w-4" />
                    </IconButton>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && (
                    <div className="flex gap-2 border-t border-border/60 bg-muted/30 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:rounded-b-2xl [&>*]:flex-1 sm:[&>*]:flex-none">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

/* ---------- Confirm: replaces window.confirm ---------- */

interface ConfirmOptions {
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    /** Red button for deletes. */
    danger?: boolean;
}

/**
 * const [confirm, confirmDialog] = useConfirm();
 * if (!(await confirm({ title: 'Delete?', danger: true }))) return;
 * ...and render {confirmDialog} once in the component.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>(resolve => {
        resolver.current = resolve;
        setOptions(opts);
    }), []);

    const settle = (value: boolean) => {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    };

    const dialog = (
        <Modal
            open={!!options}
            onClose={() => settle(false)}
            title={options?.title ?? ''}
            size="sm"
            footer={
                <>
                    <Button variant="outline" onClick={() => settle(false)} data-autofocus>Cancel</Button>
                    <Button variant={options?.danger ? 'destructive' : 'default'} onClick={() => settle(true)}>
                        {options?.confirmLabel ?? (options?.danger ? 'Delete' : 'Confirm')}
                    </Button>
                </>
            }
        >
            {options?.message && <div className="text-sm leading-relaxed text-muted-foreground">{options.message}</div>}
        </Modal>
    );

    return [confirm, dialog];
}
