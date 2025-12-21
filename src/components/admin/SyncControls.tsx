'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { triggerSync } from '@/app/actions/sync';

export function SyncControls() {
    const [loading, setLoading] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleSync = async (target: string, label: string) => {
        setLoading(target);
        setStatus({ type: null, message: '' });

        try {
            const res = await triggerSync(target);
            if (res.success) {
                setStatus({ type: 'success', message: `Sync for ${label} completed successfully!` });
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
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Manual Data Sync
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button
                    variant="default"
                    onClick={() => handleSync('all', 'All Data')}
                    disabled={loading !== null}
                    className="w-full"
                >
                    {loading === 'all' ? 'Syncing...' : 'Sync All'}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleSync('payment', 'Payments')}
                    disabled={loading !== null}
                    className="w-full"
                >
                    {loading === 'payment' ? '...' : 'Payments'}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleSync('db_chanda', 'Chanda')}
                    disabled={loading !== null}
                    className="w-full"
                >
                    {loading === 'db_chanda' ? '...' : 'Chanda'}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleSync('expenses', 'Expenses')}
                    disabled={loading !== null}
                    className="w-full"
                >
                    {loading === 'expenses' ? '...' : 'Expenses'}
                </Button>
            </div>
            {loading && (
                <p className="text-xs text-muted-foreground mt-3 text-center animate-pulse">
                    Please wait, analyzing Sheet data and updating database...
                </p>
            )}
            {status.type && (
                <div className={`mt-3 text-sm flex items-center justify-center gap-2 ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {status.message}
                </div>
            )}
        </div>
    );
}
