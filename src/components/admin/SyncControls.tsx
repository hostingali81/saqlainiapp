'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, HandCoins, Receipt, WalletCards, Loader2 } from 'lucide-react';
import { triggerSync } from '@/app/actions/sync';
import { Notice, Panel } from '@/components/admin/ui';

const TARGETS = [
    { id: 'payment', label: 'Payments', hint: 'Members ke payment aur due months', icon: WalletCards },
    { id: 'db_chanda', label: 'Chanda', hint: 'Chanda ki entries', icon: HandCoins },
    { id: 'expenses', label: 'Expenses', hint: 'Kharch ki entries', icon: Receipt },
];

export function SyncControls() {
    const [loading, setLoading] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleSync = async (target: string, label: string) => {
        setLoading(target);
        setStatus({ type: null, message: '' });

        try {
            const res = await triggerSync(target);
            if (res.success) {
                setStatus({ type: 'success', message: `${label} sync ho gaya.` });
                console.log('Sync Results:', res.results);
            } else {
                setStatus({ type: 'error', message: `Sync failed: ${res.error}` });
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: 'An unexpected error occurred.' });
            console.error(error);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <Panel
                title="Sab kuchh sync karein"
                description="Google Sheet ka poora data app ke database mein dobara layein. Sheet mein seedha badlav kiya ho tab use karein."
                icon={RefreshCw}
                bodyClassName="space-y-3"
            >
                <Button
                    size="lg"
                    onClick={() => handleSync('all', 'All data')}
                    disabled={loading !== null}
                    className="w-full rounded-lg"
                >
                    {loading === 'all' ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</> : <><RefreshCw className="h-4 w-4" /> Sync all</>}
                </Button>
            </Panel>

            <Panel title="Sirf ek hissa sync karein" description="Jaldi hota hai - jo hissa badla ho wahi chuniye." bodyClassName="space-y-2">
                {TARGETS.map(t => {
                    const Icon = t.icon;
                    const active = loading === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSync(t.id, t.label)}
                            disabled={loading !== null}
                            className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-3 text-left transition-colors hover:bg-muted active:bg-muted disabled:opacity-60"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">{t.label}</span>
                                <span className="block text-xs text-muted-foreground">{t.hint}</span>
                            </span>
                            <span className="text-xs font-medium text-primary">{active ? 'Syncing...' : 'Sync'}</span>
                        </button>
                    );
                })}
            </Panel>

            {loading && (
                <Notice tone="info">Please wait - Sheet ka data check karke database update ho raha hai. Page band na karein.</Notice>
            )}
            {status.type && (
                <Notice tone={status.type === 'success' ? 'success' : 'error'} onClose={() => setStatus({ type: null, message: '' })}>
                    {status.message}
                </Notice>
            )}
        </div>
    );
}
