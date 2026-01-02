'use client';

import { useState, useEffect } from 'react';
import { User, MonthStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processSmartPayment, getUserProfile, createNewUserPayment } from '@/app/actions/user';
import { Check, UserPlus } from 'lucide-react';
import { getPhotoUrl } from '@/lib/utils';

interface SmartEntryFormProps {
    users: User[];
    onPaymentSuccess?: () => void;
}

export function SmartEntryForm({ users, onPaymentSuccess }: SmartEntryFormProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
    const [globalRemark, setGlobalRemark] = useState<string>('');
    const [showRemarkDialog, setShowRemarkDialog] = useState(false);
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; allocated?: any[]; error?: string } | null>(null);
    const [dueMonths, setDueMonths] = useState<MonthStatus[]>([]);
    const [loadingMonths, setLoadingMonths] = useState(false);
    const [allocatedMonths, setAllocatedMonths] = useState<Array<{ month: MonthStatus, amount: number }>>([]);

    // New Entry Form States
    const [newEntryData, setNewEntryData] = useState({
        name: '',
        fname: '',
        phone: '',
        amount: '',
        frequency: 'Regular' as 'Regular' | 'One Time',
        remarks: ''
    });

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

    const userOptions = users
        .sort((a, b) => {
            if (a.frequency === 'Regular' && b.frequency === 'One Time') return -1;
            if (a.frequency === 'One Time' && b.frequency === 'Regular') return 1;
            return 0;
        })
        .map(u => ({
            value: u.id.toString(),
            label: `${u.name} - ${u.fname} (${u.bakaya_month} Due)`,
            image: `${getPhotoUrl(u.id, 'small')}?v=${Date.now()}`
        }));

    const calculateAllocations = () => {
        const allocated: Array<{ month: MonthStatus, amount: number }> = [];
        if (!amount || parseInt(amount) <= 0) return allocated;

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let totalAmount = parseInt(amount);

        // If no due months OR user is One Time, allocate to current month
        if (dueMonths.length === 0 || selectedUser?.frequency === 'One Time') {
            const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
            allocated.push({
                month: {
                    year: currentYear,
                    month: currentMonth,
                    monthName: monthName,
                    amount: totalAmount,
                    status: 'paid'
                },
                amount: totalAmount
            });
            return allocated;
        }

        // Check if current month is in due list
        const hasCurrentMonth = dueMonths.some(d => d.year === currentYear && d.month === currentMonth);

        // Special case: exactly 100 and current month is due
        if (totalAmount === 100 && hasCurrentMonth) {
            const current = dueMonths.find(d => d.year === currentYear && d.month === currentMonth);
            if (current) {
                allocated.push({ month: current, amount: 100 });
            }
            return allocated;
        }

        // Calculate how many months can be cleared with minimum amounts
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

        // Distribute amount equally among clearable months
        if (clearableMonths > 0) {
            const perMonth = Math.floor(totalAmount / clearableMonths);
            const remainder = totalAmount % clearableMonths;

            for (let i = 0; i < clearableMonths; i++) {
                const allocAmount = perMonth + (i < remainder ? 1 : 0);
                allocated.push({ month: dueMonths[i], amount: allocAmount });
            }
        } else {
            // Amount is not enough to clear any month - allocate to current month if due, else oldest
            const targetMonth = hasCurrentMonth
                ? dueMonths.find(d => d.year === currentYear && d.month === currentMonth)
                : dueMonths[0];

            if (targetMonth) {
                allocated.push({ month: targetMonth, amount: totalAmount });
            }
        }

        return allocated;
    };

    const handleOpenRemarkDialog = () => {
        const allocated = calculateAllocations();
        setAllocatedMonths(allocated);
        // Initialize custom amounts with calculated amounts
        const initialAmounts: Record<string, number> = {};
        allocated.forEach(({ month, amount }) => {
            initialAmounts[`${month.year}-${month.month}`] = amount;
        });
        setCustomAmounts(initialAmounts);
        setShowRemarkDialog(true);
    };

    const handlePayment = async () => {
        if (!selectedUserId || !amount) return;

        setLoading(true);
        setResult(null);

        try {
            // Calculate allocations if not already done
            const allocations = allocatedMonths.length > 0 ? allocatedMonths : calculateAllocations();

            // Use custom amounts if edited, otherwise use calculated
            const finalAllocations = allocations.map(({ month }) => {
                const key = `${month.year}-${month.month}`;
                const customAmount = customAmounts[key];
                const calculatedAmount = allocations.find(a => a.month.year === month.year && a.month.month === month.month)?.amount || 0;
                return {
                    year: month.year,
                    month: month.month,
                    amount: customAmount !== undefined ? customAmount : calculatedAmount
                };
            });

            const res = await processSmartPayment(parseInt(selectedUserId), parseInt(amount), remarks, finalAllocations);
            setResult(res);
            if (res.success) {
                setAmount('');
                setRemarks({});
                setCustomAmounts({});
                setGlobalRemark('');
                setShowRemarkDialog(false);
                setAllocatedMonths([]);
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
        allocatedMonths.forEach(({ month }) => {
            const key = `${month.year}-${month.month}`;
            newRemarks[key] = globalRemark;
        });
        setRemarks(newRemarks);
    };

    const handleNewEntrySubmit = async () => {
        if (!newEntryData.name || !newEntryData.fname || !newEntryData.phone || !newEntryData.amount) {
            setResult({ error: 'Please fill all required fields' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await createNewUserPayment(newEntryData);
            setResult(res);
            if (res.success) {
                setNewEntryData({
                    name: '',
                    fname: '',
                    phone: '',
                    amount: '',
                    frequency: 'Regular',
                    remarks: ''
                });
                setShowNewEntryForm(false);
                onPaymentSuccess?.();
            }
        } catch (e) {
            setResult({ error: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
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
                                setShowNewEntryForm(false);
                            }}
                            placeholder="Search and select user..."
                            onNewEntry={() => setShowNewEntryForm(true)}
                        />
                    </div>

                    {showNewEntryForm && (
                        <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700">New User Payment Entry</h4>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Name *</label>
                                <Input
                                    type="text"
                                    placeholder="Enter name"
                                    value={newEntryData.name}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Father Name *</label>
                                <Input
                                    type="text"
                                    placeholder="Enter father name"
                                    value={newEntryData.fname}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, fname: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Mobile No *</label>
                                <Input
                                    type="tel"
                                    placeholder="Enter mobile number"
                                    value={newEntryData.phone}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Amount (₹) *</label>
                                <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={newEntryData.amount}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Payment Frequency *</label>
                                <Select
                                    value={newEntryData.frequency}
                                    onValueChange={(value: 'Regular' | 'One Time') => setNewEntryData({ ...newEntryData, frequency: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Regular">Regular</SelectItem>
                                        <SelectItem value="One Time">One Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Remarks</label>
                                <Input
                                    type="text"
                                    placeholder="Optional remarks"
                                    value={newEntryData.remarks}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, remarks: e.target.value })}
                                />
                            </div>

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={loading}
                                onClick={handleNewEntrySubmit}
                            >
                                {loading ? 'Processing...' : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Submit New Entry
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {!showNewEntryForm && selectedUser && (
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

                    {!showNewEntryForm && (
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
                    )}

                    {!showNewEntryForm && selectedUser && selectedUser.frequency !== 'One Time' && (
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
                                                className={`text-xs px-2 py-1 rounded-full ${allocatedAmount > 0
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
                        ) : amount && parseInt(amount) > 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                <p className="text-sm font-semibold text-green-800 mb-2">Payment Allocation:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        const allocated = calculateAllocations();
                                        return allocated.map((a, idx) => (
                                            <span
                                                key={idx}
                                                className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
                                            >
                                                {a.month.monthName} {a.month.year} - ₹{a.amount}
                                            </span>
                                        ));
                                    })()}
                                </div>
                            </div>
                        ) : null
                    )}

                    {!showNewEntryForm && selectedUser && selectedUser.frequency === 'One Time' && amount && parseInt(amount) > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                            <p className="text-sm font-semibold text-green-800 mb-2">Payment Allocation:</p>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const allocated = calculateAllocations();
                                    return allocated.map((a, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"
                                        >
                                            {a.month.monthName} {a.month.year} - ₹{a.amount}
                                        </span>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {!showNewEntryForm && (
                        <Button
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={!selectedUserId || !amount || loading}
                            onClick={handlePayment}
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    {dueMonths.length > 0 ? 'Clear Due Months' : 'Add Payment'}
                                </>
                            )}
                        </Button>
                    )}

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
                            {allocatedMonths.map(({ month, amount }) => {
                                const monthKey = `${month.year}-${month.month}`;
                                return (
                                    <div key={monthKey} className="space-y-1 p-3 bg-gray-50 rounded-md">
                                        <label className="text-xs font-medium text-green-700">
                                            {month.monthName} {month.year}
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    type="number"
                                                    placeholder="Amount"
                                                    value={customAmounts[monthKey] || amount}
                                                    onChange={(e) => setCustomAmounts({ ...customAmounts, [monthKey]: parseInt(e.target.value) || 0 })}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    type="text"
                                                    placeholder="Remark (optional)"
                                                    value={remarks[monthKey] || ''}
                                                    onChange={(e) => setRemarks({ ...remarks, [monthKey]: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRemarkDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setShowRemarkDialog(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
