'use client';

import { useState, useEffect } from 'react';
import { User, MonthStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { processSmartPayment, getUserProfile } from '@/app/actions/user';
import { Check } from 'lucide-react';

interface SmartEntryFormProps {
    users: User[];
    onPaymentSuccess?: () => void;
}

export function SmartEntryForm({ users, onPaymentSuccess }: SmartEntryFormProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [globalRemark, setGlobalRemark] = useState<string>('');
    const [showRemarkDialog, setShowRemarkDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; allocated?: any[]; error?: string } | null>(null);
    const [dueMonths, setDueMonths] = useState<MonthStatus[]>([]);
    const [loadingMonths, setLoadingMonths] = useState(false);
    const [allocatedMonths, setAllocatedMonths] = useState<Array<{month: MonthStatus, amount: number}>>([]);

    const selectedUser = users.find(u => u.id.toString() === selectedUserId);

    useEffect(() => {
        if (selectedUserId) {
            setLoadingMonths(true);
            getUserProfile(parseInt(selectedUserId)).then(res => {
                if ('error' in res) {
                    setDueMonths([]);
                } else {
                    const dueOnly = res.financials?.history.filter(h => h.status === 'due') || [];
                    const sorted = dueOnly.sort((a, b) => (a.year - b.year) || (a.month - b.month));
                    setDueMonths(sorted);
                }
                setLoadingMonths(false);
            });
        } else {
            setDueMonths([]);
        }
    }, [selectedUserId]);

    const userOptions = users.map(u => ({
        value: u.id.toString(),
        label: `${u.name} (${u.bakaya_month} Due)`
    }));

    const calculateAllocations = () => {
        const allocated: Array<{month: MonthStatus, amount: number}> = [];
        if (!amount || parseInt(amount) <= 0) return allocated;

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const totalAmount = parseInt(amount);
        
        const hasCurrentMonth = dueMonths.some(d => d.year === currentYear && d.month === currentMonth);
        
        if (totalAmount === 100 && hasCurrentMonth) {
            const current = dueMonths.find(d => d.year === currentYear && d.month === currentMonth);
            if (current) allocated.push({month: current, amount: 100});
        } else {
            let remaining = totalAmount;
            let clearableMonths = 0;
            for (let i = 0; i < dueMonths.length; i++) {
                const isCurrent = dueMonths[i].year === currentYear && dueMonths[i].month === currentMonth;
                const min = isCurrent ? 100 : 125;
                if (remaining >= min) {
                    remaining -= min;
                    clearableMonths++;
                } else {
                    break;
                }
            }
            
            if (clearableMonths > 0) {
                const perMonth = Math.floor(totalAmount / clearableMonths);
                const remainder = totalAmount % clearableMonths;
                for (let i = 0; i < clearableMonths; i++) {
                    const allocAmount = perMonth + (i < remainder ? 1 : 0);
                    allocated.push({month: dueMonths[i], amount: allocAmount});
                }
            }
        }
        return allocated;
    };

    const handleOpenRemarkDialog = () => {
        const allocated = calculateAllocations();
        setAllocatedMonths(allocated);
        setShowRemarkDialog(true);
    };

    const handlePayment = async () => {
        if (!selectedUserId || !amount) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await processSmartPayment(parseInt(selectedUserId), parseInt(amount), remarks);
            setResult(res);
            if (res.success) {
                setAmount('');
                setRemarks({});
                setGlobalRemark('');
                setShowRemarkDialog(false);
                onPaymentSuccess?.();
            }
        } catch (e) {
            setResult({ error: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const applyGlobalRemark = () => {
        const newRemarks: Record<string, string> = {};
        allocatedMonths.forEach(({month}) => {
            const key = `${month.year}-${month.month}`;
            newRemarks[key] = globalRemark;
        });
        setRemarks(newRemarks);
    };

    return (
        <>
            <Card className="w-full max-w-lg mx-auto border-t-4 border-t-secondary">
                <CardHeader>
                    <CardTitle>Payment Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select User</label>
                        <SearchableSelect
                            options={userOptions}
                            value={selectedUserId}
                            onChange={(value) => {
                                setSelectedUserId(value);
                                setResult(null);
                            }}
                            placeholder="Search and select user..."
                        />
                    </div>

                    {selectedUser && (
                        <div className="bg-muted p-3 rounded-md text-sm grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-muted-foreground">Total Due Months:</span>
                                <p className="font-bold text-red-600">{selectedUser.bakaya_month}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Total Amount:</span>
                                <p className="font-bold text-red-600">₹{selectedUser.bakaya_month * (selectedUser.amount || 125)}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Paid Amount (₹)</label>
                        <Input
                            type="number"
                            placeholder="e.g. 500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {amount && (
                            <p className="text-xs text-muted-foreground">
                                Will clear approx <strong>{Math.floor(parseInt(amount) / 125)}</strong> months.
                            </p>
                        )}
                    </div>

                    {selectedUser && (
                        loadingMonths ? (
                            <div className="text-sm text-muted-foreground text-center p-2">Loading due months...</div>
                        ) : dueMonths.length > 0 ? (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-red-800">Due Months:</p>
                                    <button
                                        type="button"
                                        onClick={handleOpenRemarkDialog}
                                        disabled={!amount || parseInt(amount) <= 0}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Remarks
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {dueMonths.map((m, idx) => {
                                        const allocated = calculateAllocations();
                                        const allocatedItem = allocated.find(a => a.month.year === m.year && a.month.month === m.month);
                                        const allocatedAmount = allocatedItem?.amount || 0;
                                        
                                        return (
                                            <span 
                                                key={`${m.year}-${m.month}`} 
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                    allocatedAmount > 0 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {m.monthName} {m.year}{allocatedAmount > 0 && ` - ₹${allocatedAmount}`}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null
                    )}

                    <Button
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={!selectedUserId || !amount || loading}
                        onClick={handlePayment}
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Auto-Allocate Payment
                            </>
                        )}
                    </Button>

                    {result && (
                        <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {result.error ? (
                                <p>Error: {result.error}</p>
                            ) : (
                                <div>
                                    <p className="font-bold">Success! Payment Allocated:</p>
                                    <ul className="list-disc list-inside mt-1">
                                        {result.allocated?.map((a, i) => (
                                            <li key={i}>{a.year}-{a.month}: ₹{a.amount}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showRemarkDialog} onOpenChange={setShowRemarkDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Remarks</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                type="text"
                                placeholder="Global remark for all months"
                                value={globalRemark}
                                onChange={(e) => setGlobalRemark(e.target.value)}
                                className="text-sm flex-1"
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={applyGlobalRemark}
                                className="w-full sm:w-auto"
                            >
                                Apply to All
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {allocatedMonths.map(({month, amount}) => {
                                const monthKey = `${month.year}-${month.month}`;
                                return (
                                    <div key={monthKey} className="space-y-1">
                                        <label className="text-xs font-medium text-green-700">
                                            {month.monthName} {month.year} - ₹{amount}
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="Remark (optional)"
                                            value={remarks[monthKey] || ''}
                                            onChange={(e) => setRemarks({...remarks, [monthKey]: e.target.value})}
                                            className="text-sm"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRemarkDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
