'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, MonthStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processSmartPayment, getUserProfile, createNewUserPayment } from '@/app/actions/user';
import {
    allocatePayment,
    needsAllocationChoice,
    findCurrentMonth,
    findOldestDueMonth,
    PaymentAllocation,
    AllocationChoice
} from '@/lib/logic';
import { Check, UserPlus } from 'lucide-react';
import { getPhotoUrl } from '@/lib/utils';

interface SmartEntryFormProps {
    users: User[];
    onPaymentSuccess?: () => void;
}

const MONTHLY_RATE = 125;
const monthKeyOf = (a: { year: number; month: number }) => `${a.year}-${a.month}`;

export function SmartEntryForm({ users, onPaymentSuccess }: SmartEntryFormProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
    const [globalRemark, setGlobalRemark] = useState<string>('');
    const [showRemarkDialog, setShowRemarkDialog] = useState(false);
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; allocated?: any[]; error?: string; warning?: string } | null>(null);
    // Full history, not just the due months: deciding whether the destination is
    // ambiguous needs to know what the current month has already been paid.
    const [history, setHistory] = useState<MonthStatus[]>([]);
    const [allocationChoice, setAllocationChoice] = useState<AllocationChoice | null>(null);
    const [loadingMonths, setLoadingMonths] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const amountInputRef = useRef<HTMLInputElement>(null);

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

    /**
     * Everything below is scoped to one user + one amount. Leaving any of it
     * behind is how a payment could get filed against the previously selected
     * user, or against the months an earlier amount had worked out.
     */
    const resetEntryState = useCallback(() => {
        setAmount('');
        setRemarks({});
        setCustomAmounts({});
        setGlobalRemark('');
        setAllocationChoice(null);
        setShowRemarkDialog(false);
    }, []);

    useEffect(() => {
        if (!selectedUserId) {
            setHistory([]);
            return;
        }

        let cancelled = false;
        setLoadingMonths(true);

        getUserProfile(parseInt(selectedUserId)).then(res => {
            if (cancelled) return;
            setHistory('error' in res ? [] : (res.financials?.history || []));
            setLoadingMonths(false);
        });

        if (!showNewEntryForm) {
            const t = setTimeout(() => amountInputRef.current?.focus(), 100);
            return () => { cancelled = true; clearTimeout(t); };
        }

        return () => { cancelled = true; };
        // reloadKey forces a re-fetch after a successful payment, otherwise the
        // form kept offering months that were just paid.
    }, [selectedUserId, showNewEntryForm, reloadKey]);

    // Cache-buster is fixed for the life of the component; recomputing
    // Date.now() on every render re-downloaded every avatar each keystroke.
    const photoVersion = useMemo(() => Date.now(), []);

    const userOptions = useMemo(() => (
        [...users]
            .sort((a, b) => {
                if (a.frequency === 'Regular' && b.frequency === 'One Time') return -1;
                if (a.frequency === 'One Time' && b.frequency === 'Regular') return 1;
                return 0;
            })
            .map(u => ({
                value: u.id.toString(),
                label: `${u.name} - ${u.fname} (${u.bakaya_month} Due)`,
                image: `${getPhotoUrl(u.id, 'small')}?v=${photoVersion}`
            }))
    ), [users, photoVersion]);

    const amountNum = Number(amount);
    const amountValid = amount.trim() !== '' && Number.isInteger(amountNum) && amountNum > 0;

    const dueMonths = useMemo(
        () => history
            .filter(h => h.status === 'due')
            .sort((a, b) => (a.year - b.year) || (a.month - b.month)),
        [history]
    );

    const currentMonthEntry = useMemo(() => findCurrentMonth(history), [history]);
    const oldestDueMonth = useMemo(() => findOldestDueMonth(history), [history]);

    /**
     * The current month is already paid, an older month is still due, and the
     * amount cannot clear that older month outright. Either destination is
     * defensible, so the admin picks rather than the system guessing.
     */
    const needsChoice = useMemo(() => (
        !!selectedUser && amountValid
        && needsAllocationChoice(amountNum, history, MONTHLY_RATE, selectedUser.frequency)
    ), [selectedUser, amountValid, amountNum, history]);

    // Only honour a choice while it is actually being asked for, so a leftover
    // value can never quietly redirect an unrelated payment.
    const effectiveChoice = needsChoice ? (allocationChoice ?? undefined) : undefined;

    /**
     * Derived, never stored. The old code snapshotted the allocation when the
     * remarks dialog opened and then reused that snapshot at submit time, so
     * changing the amount (or the user) afterwards saved the stale split.
     */
    const allocations: PaymentAllocation[] = useMemo(() => {
        if (!selectedUser || !amountValid) return [];
        // Nothing is allocated until the admin answers the question.
        if (needsChoice && !allocationChoice) return [];
        return allocatePayment(amountNum, history, MONTHLY_RATE, selectedUser.frequency, effectiveChoice);
    }, [selectedUser, amountValid, amountNum, history, needsChoice, allocationChoice, effectiveChoice]);

    const amountFor = useCallback(
        (a: PaymentAllocation) => customAmounts[monthKeyOf(a)] ?? a.amount,
        [customAmounts]
    );

    const allocatedTotal = useMemo(
        () => allocations.reduce((sum, a) => sum + amountFor(a), 0),
        [allocations, amountFor]
    );

    /**
     * Months in this allocation that the member has ALREADY paid for.
     *
     * Happens whenever someone who is fully up to date pays again: there are no
     * due months left, so the whole amount lands on the current month. That is a
     * legitimate extra payment, so the form tells the server it knows about it.
     * A stale form would still think those months were due and would not list
     * them, which is how the duplicate-payment guard stays effective.
     */
    const alreadyPaidAllocations = useMemo(
        () => allocations
            .map(a => ({
                allocation: a,
                existing: history.find(h => h.year === a.year && h.month === a.month && h.status === 'paid')
            }))
            .filter((x): x is { allocation: PaymentAllocation; existing: MonthStatus } => !!x.existing),
        [allocations, history]
    );

    const acknowledgedPaidMonths = useMemo(
        () => alreadyPaidAllocations.map(x => monthKeyOf(x.allocation)),
        [alreadyPaidAllocations]
    );

    // Allocated months that are not in the due list - i.e. a top-up onto an
    // already-paid month, which the due-month chips cannot show.
    const outsideDueAllocations = useMemo(
        () => allocations.filter(a => !dueMonths.some(m => m.year === a.year && m.month === a.month)),
        [allocations, dueMonths]
    );

    // Overrides can be edited freely, so check them the same way the server does.
    const allocationAmountsValid = allocations.every(a => {
        const v = amountFor(a);
        return Number.isInteger(v) && v > 0;
    });
    const totalsMatch = allocations.length > 0 && allocatedTotal === amountNum;
    const canSubmit = !!selectedUserId && amountValid && allocations.length > 0
        && allocationAmountsValid && totalsMatch && !loading;

    const handlePayment = async () => {
        if (!canSubmit || !selectedUser) return;

        setLoading(true);
        setResult(null);

        try {
            const finalAllocations = allocations.map(a => ({
                year: a.year,
                month: a.month,
                monthName: a.monthName,
                amount: amountFor(a)
            }));

            const res = await processSmartPayment(
                parseInt(selectedUserId),
                amountNum,
                remarks,
                finalAllocations,
                effectiveChoice,
                acknowledgedPaidMonths
            );
            setResult(res);

            if (res.success) {
                // Keep `result` so the success summary stays on screen.
                resetEntryState();
                // Re-read this user's due months and refresh the rest of the page.
                setReloadKey(k => k + 1);
                onPaymentSuccess?.();
            }
        } catch (e) {
            setResult({ error: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const applyGlobalRemark = () => {
        const newRemarks: Record<string, string> = { ...remarks };
        allocations.forEach(a => { newRemarks[monthKeyOf(a)] = globalRemark; });
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

    const allocationChips = (
        <div className="flex flex-wrap gap-2">
            {allocations.map(a => (
                <span key={monthKeyOf(a)} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    {a.monthName} {a.year} - ₹{amountFor(a)}
                </span>
            ))}
        </div>
    );

    return (
        <>
            <Card className="w-full max-w-lg mx-auto border-t-4 border-t-secondary mb-6">
                <CardHeader>
                    <CardTitle>Payment Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-32">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select User</label>
                        <SearchableSelect
                            options={userOptions}
                            value={selectedUserId}
                            onChange={(value) => {
                                setSelectedUserId(value);
                                setShowNewEntryForm(false);
                                resetEntryState();
                                setResult(null);
                            }}
                            placeholder="Search and select user..."
                            onNewEntry={() => {
                                setShowNewEntryForm(true);
                                setSelectedUserId('');
                                resetEntryState();
                                setResult(null);
                            }}
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
                                    inputMode="numeric"
                                    placeholder="10 digit mobile number"
                                    value={newEntryData.phone}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium">Amount (₹) *</label>
                                <Input
                                    type="number"
                                    min={1}
                                    step={1}
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
                                        <UserPlus className="mr-2 h-4 w-4" />
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
                                <p className="font-bold text-red-600">₹{selectedUser.bakaya_month * (selectedUser.amount || MONTHLY_RATE)}</p>
                            </div>
                        </div>
                    )}

                    {!showNewEntryForm && selectedUser && selectedUser.frequency !== 'One Time' && loadingMonths && (
                        <div className="text-sm text-muted-foreground text-center p-2">Loading due months...</div>
                    )}

                    {!showNewEntryForm && selectedUser && !loadingMonths && (
                        selectedUser.frequency !== 'One Time' && dueMonths.length > 0 ? (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-red-800">Due Months:</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowRemarkDialog(true)}
                                        disabled={allocations.length === 0}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Remarks
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {dueMonths.map(m => {
                                        const allocated = allocations.find(a => a.year === m.year && a.month === m.month);
                                        const allocatedAmount = allocated ? amountFor(allocated) : 0;

                                        return (
                                            <span
                                                key={monthKeyOf(m)}
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

                                {/* A top-up lands on a month that is already paid, so it has no
                                    chip above. Show it here or the money would go somewhere the
                                    admin cannot see. */}
                                {outsideDueAllocations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200">
                                        <p className="text-xs font-semibold text-green-800 mb-1">This payment goes to:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {outsideDueAllocations.map(a => (
                                                <span key={monthKeyOf(a)} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                                    {a.monthName} {a.year} - ₹{amountFor(a)} (top-up)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : allocations.length > 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                <p className="text-sm font-semibold text-green-800 mb-2">Payment Allocation:</p>
                                {allocationChips}
                            </div>
                        ) : null
                    )}

                    {!showNewEntryForm && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Paid Amount (₹)</label>
                            <Input
                                ref={amountInputRef}
                                type="number"
                                min={1}
                                step={1}
                                placeholder="e.g. 500"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    // Per-month overrides were worked out for the previous
                                    // amount, so they must not survive a change to it.
                                    setCustomAmounts({});
                                    // Same for the destination: a new amount is a fresh
                                    // decision, so the admin picks again.
                                    setAllocationChoice(null);
                                }}
                                onKeyDown={(e) => {
                                    // `loading` was missing here, so a double Enter fired
                                    // two payments.
                                    if (e.key === 'Enter' && canSubmit) {
                                        e.preventDefault();
                                        handlePayment();
                                    }
                                }}
                            />
                            {amount.trim() !== '' && !amountValid && (
                                <p className="text-xs text-red-600">Enter a whole amount greater than 0.</p>
                            )}
                            {amountValid && allocations.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Will clear <strong>{allocations.length}</strong> month{allocations.length === 1 ? '' : 's'}.
                                </p>
                            )}
                            {amountValid && allocations.length > 0 && !allocationAmountsValid && (
                                <p className="text-xs text-red-600">
                                    Every month needs a whole amount greater than 0. Fix the amounts under Remarks.
                                </p>
                            )}
                            {amountValid && allocations.length > 0 && allocationAmountsValid && !totalsMatch && (
                                <p className="text-xs text-red-600">
                                    Month-wise total is ₹{allocatedTotal} but the paid amount is ₹{amountNum}. Fix the amounts under Remarks.
                                </p>
                            )}
                        </div>
                    )}

                    {/* An up-to-date member paying again lands on a month that is
                        already paid. That is fine, but the admin should see it
                        stated rather than just a green chip. */}
                    {!showNewEntryForm && !needsChoice && alreadyPaidAllocations.length > 0 && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                            <p className="text-sm font-semibold text-amber-900">Already paid — this will be added on top</p>
                            {alreadyPaidAllocations.map(({ allocation, existing }) => (
                                <p key={monthKeyOf(allocation)} className="text-xs text-amber-800">
                                    {existing.monthName} {existing.year} already has ₹{existing.amount} paid.
                                    Adding ₹{amountFor(allocation)} makes it ₹{existing.amount + amountFor(allocation)}.
                                </p>
                            ))}
                        </div>
                    )}

                    {!showNewEntryForm && needsChoice && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                            <p className="text-sm font-semibold text-amber-900">Where should this payment go?</p>
                            <p className="text-xs text-amber-800">
                                {currentMonthEntry?.monthName} {currentMonthEntry?.year} already has ₹{currentMonthEntry?.amount} paid,
                                and {oldestDueMonth?.monthName} {oldestDueMonth?.year} is still due.
                                ₹{amountNum} is not enough to clear {oldestDueMonth?.monthName} in full, so please choose.
                            </p>

                            <div className="space-y-1">
                                <label className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-amber-100">
                                    <input
                                        type="radio"
                                        name="allocationChoice"
                                        className="mt-1"
                                        checked={allocationChoice === 'oldest'}
                                        onChange={() => setAllocationChoice('oldest')}
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">
                                            Add to {oldestDueMonth?.monthName} {oldestDueMonth?.year}
                                        </span>
                                        <span className="block text-xs text-amber-800">
                                            Oldest due month — goes in as a partial payment
                                        </span>
                                    </span>
                                </label>

                                <label className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-amber-100">
                                    <input
                                        type="radio"
                                        name="allocationChoice"
                                        className="mt-1"
                                        checked={allocationChoice === 'currentMonth'}
                                        onChange={() => setAllocationChoice('currentMonth')}
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">
                                            Add to {currentMonthEntry?.monthName} {currentMonthEntry?.year}
                                        </span>
                                        <span className="block text-xs text-amber-800">
                                            Top-up — this month&apos;s total becomes ₹{(currentMonthEntry?.amount ?? 0) + amountNum}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            {!allocationChoice && (
                                <p className="text-xs font-medium text-red-600">
                                    Choose one option to continue.
                                </p>
                            )}
                        </div>
                    )}

                    {!showNewEntryForm && (
                        <Button
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={!canSubmit}
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
                                            <li key={i}>{a.monthName ? `${a.monthName} ${a.year}` : `${a.year}-${a.month}`}: ₹{a.amount}</li>
                                        ))}
                                    </ul>
                                    {result.warning && (
                                        <p className="mt-2 text-amber-800 bg-amber-100 rounded p-2">⚠ {result.warning}</p>
                                    )}
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
                            {allocations.map(a => {
                                const monthKey = monthKeyOf(a);
                                return (
                                    <div key={monthKey} className="space-y-1 p-3 bg-gray-50 rounded-md">
                                        <label className="text-xs font-medium text-green-700">
                                            {a.monthName} {a.year}
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    placeholder="Amount"
                                                    // `||` here meant a typed 0 silently fell back to
                                                    // the calculated amount on screen while 0 was what
                                                    // actually got submitted.
                                                    value={customAmounts[monthKey] ?? a.amount}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        setCustomAmounts(prev => {
                                                            const next = { ...prev };
                                                            if (raw === '') delete next[monthKey];
                                                            else next[monthKey] = Number(raw);
                                                            return next;
                                                        });
                                                    }}
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
                        <div className={`text-sm rounded-md p-2 ${totalsMatch ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                            Month-wise total: <strong>₹{allocatedTotal}</strong> of <strong>₹{amountNum || 0}</strong>
                            {!totalsMatch && ` — ₹${amountNum - allocatedTotal} unallocated`}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCustomAmounts({});
                                setShowRemarkDialog(false);
                            }}
                        >
                            Reset amounts
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
