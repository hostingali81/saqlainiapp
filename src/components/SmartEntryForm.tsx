'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, MonthStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Field, Modal, Notice, Panel, inputCls, selectCls } from '@/components/admin/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processSmartPayment, getUserProfile, createNewUserPayment } from '@/app/actions/user';
import {
    allocatePayment,
    needsAllocationChoice,
    findCurrentMonth,
    findOldestDueMonth,
    MONTHLY_RATE,
    PaymentAllocation,
    AllocationChoice
} from '@/lib/logic';
import { Check, Loader2, MessageSquarePlus, UserPlus, WalletCards } from 'lucide-react';
import { getPhotoUrl } from '@/lib/utils';

interface SmartEntryFormProps {
    users: User[];
    onPaymentSuccess?: () => void;
}

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
    // Whose months `history` holds. Payments may only be worked out once this
    // matches the selected member - see the effect below.
    const [historyUserId, setHistoryUserId] = useState<string | null>(null);
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
        // Drop the previous member's months straight away. They used to linger
        // while the new member's loaded, so a quick amount + Enter allocated
        // the payment against the PREVIOUS member's due months.
        setHistory([]);
        setHistoryUserId(null);

        if (!selectedUserId) {
            setLoadingMonths(false);
            return;
        }

        let cancelled = false;
        setLoadingMonths(true);

        getUserProfile(parseInt(selectedUserId))
            .then(res => {
                if (cancelled) return;
                if ('error' in res) {
                    setResult({ error: `Could not load this member's months: ${res.error}` });
                    return;
                }
                setHistory(res.financials?.history || []);
                setHistoryUserId(selectedUserId);
            })
            .catch(() => {
                if (!cancelled) setResult({ error: "Could not load this member's months. Please select them again." });
            })
            .finally(() => {
                if (!cancelled) setLoadingMonths(false);
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
    // The loaded months belong to the member currently selected.
    const historyReady = !!selectedUserId && historyUserId === selectedUserId && !loadingMonths;

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
        !!selectedUser && amountValid && historyReady
        && needsAllocationChoice(amountNum, history, MONTHLY_RATE, selectedUser.frequency)
    ), [selectedUser, amountValid, historyReady, amountNum, history]);

    // Only honour a choice while it is actually being asked for, so a leftover
    // value can never quietly redirect an unrelated payment.
    const effectiveChoice = needsChoice ? (allocationChoice ?? undefined) : undefined;

    /**
     * Derived, never stored. The old code snapshotted the allocation when the
     * remarks dialog opened and then reused that snapshot at submit time, so
     * changing the amount (or the user) afterwards saved the stale split.
     */
    const allocations: PaymentAllocation[] = useMemo(() => {
        if (!selectedUser || !amountValid || !historyReady) return [];
        // Nothing is allocated until the admin answers the question.
        if (needsChoice && !allocationChoice) return [];
        return allocatePayment(amountNum, history, MONTHLY_RATE, selectedUser.frequency, effectiveChoice);
    }, [selectedUser, amountValid, historyReady, amountNum, history, needsChoice, allocationChoice, effectiveChoice]);

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
    const canSubmit = !!selectedUserId && amountValid && historyReady && allocations.length > 0
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
                <span key={monthKeyOf(a)} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    {a.monthName} {a.year} - ₹{amountFor(a)}
                </span>
            ))}
        </div>
    );

    return (
        <>
            <Panel title="Payment entry" description="Member chuniye, rakam likhiye - months apne aap allocate honge." icon={WalletCards} bodyClassName="space-y-4">
                    <Field label="Member">
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
                    </Field>

                    {showNewEntryForm && (
                        <div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-primary"><UserPlus className="h-4 w-4" /> Naya member + payment</h4>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name *</label>
                                <Input
                                    type="text"
                                    placeholder="Enter name"
                                    value={newEntryData.name}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, name: e.target.value })}
                                    className={inputCls}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Father Name *</label>
                                <Input
                                    type="text"
                                    placeholder="Enter father name"
                                    value={newEntryData.fname}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, fname: e.target.value })}
                                    className={inputCls}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mobile No *</label>
                                <Input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="10 digit mobile number"
                                    value={newEntryData.phone}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, phone: e.target.value })}
                                    className={inputCls}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount (₹) *</label>
                                <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    placeholder="Enter amount"
                                    value={newEntryData.amount}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, amount: e.target.value })}
                                    className={inputCls}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Frequency *</label>
                                <Select
                                    value={newEntryData.frequency}
                                    onValueChange={(value: 'Regular' | 'One Time') => setNewEntryData({ ...newEntryData, frequency: value })}
                                >
                                    <SelectTrigger className={selectCls}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Regular">Regular</SelectItem>
                                        <SelectItem value="One Time">One Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Remarks</label>
                                <Input
                                    type="text"
                                    placeholder="Optional remarks"
                                    value={newEntryData.remarks}
                                    onChange={(e) => setNewEntryData({ ...newEntryData, remarks: e.target.value })}
                                    className={inputCls}
                                />
                            </div>

                            <Button
                                size="lg"
                                className="w-full rounded-lg"
                                disabled={loading}
                                onClick={handleNewEntrySubmit}
                            >
                                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Submit new entry
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {!showNewEntryForm && selectedUser && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-muted/70 px-3.5 py-2.5">
                                <span className="text-xs text-muted-foreground">Due months</span>
                                <p className={`text-lg font-bold ${selectedUser.bakaya_month > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{selectedUser.bakaya_month}</p>
                            </div>
                            <div className="rounded-xl bg-muted/70 px-3.5 py-2.5">
                                <span className="text-xs text-muted-foreground">Baki rakam</span>
                                <p className={`text-lg font-bold ${selectedUser.bakaya_month > 0 ? 'text-red-600' : 'text-emerald-700'}`}>₹{selectedUser.bakaya_month * (selectedUser.amount || MONTHLY_RATE)}</p>
                            </div>
                        </div>
                    )}

                    {!showNewEntryForm && selectedUser && selectedUser.frequency !== 'One Time' && loadingMonths && (
                        <div className="flex items-center justify-center gap-2 p-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Due months load ho rahe hain...</div>
                    )}

                    {!showNewEntryForm && selectedUser && !loadingMonths && (
                        selectedUser.frequency !== 'One Time' && dueMonths.length > 0 ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-sm font-semibold text-red-800">Due months</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowRemarkDialog(true)}
                                        disabled={allocations.length === 0}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-medium text-primary shadow-sm ring-1 ring-border hover:bg-muted disabled:opacity-50"
                                    >
                                        <MessageSquarePlus className="h-3.5 w-3.5" />
                                        Remarks / amounts
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {dueMonths.map(m => {
                                        const allocated = allocations.find(a => a.year === m.year && a.month === m.month);
                                        const allocatedAmount = allocated ? amountFor(allocated) : 0;

                                        return (
                                            <span
                                                key={monthKeyOf(m)}
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${allocatedAmount > 0
                                                    ? 'bg-emerald-100 text-emerald-800'
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
                                                <span key={monthKeyOf(a)} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                                    {a.monthName} {a.year} - ₹{amountFor(a)} (top-up)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : allocations.length > 0 ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <p className="mb-2 text-sm font-semibold text-emerald-900">Payment allocation</p>
                                {allocationChips}
                            </div>
                        ) : null
                    )}

                    {!showNewEntryForm && (
                        <Field label="Paid amount (₹)">
                            <Input
                                ref={amountInputRef}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                className={`${inputCls} text-lg font-semibold`}
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
                        </Field>
                    )}

                    {/* An up-to-date member paying again lands on a month that is
                        already paid. That is fine, but the admin should see it
                        stated rather than just a green chip. */}
                    {!showNewEntryForm && !needsChoice && alreadyPaidAllocations.length > 0 && (
                        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3">
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
                        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                            <p className="text-sm font-semibold text-amber-900">Where should this payment go?</p>
                            <p className="text-xs text-amber-800">
                                {currentMonthEntry?.monthName} {currentMonthEntry?.year} already has ₹{currentMonthEntry?.amount} paid,
                                and {oldestDueMonth?.monthName} {oldestDueMonth?.year} is still due.
                                ₹{amountNum} is not enough to clear {oldestDueMonth?.monthName} in full, so please choose.
                            </p>

                            <div className="space-y-1">
                                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 hover:bg-amber-100 has-[:checked]:bg-amber-100">
                                    <input
                                        type="radio"
                                        name="allocationChoice"
                                        className="mt-1 h-4 w-4 accent-primary"
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

                                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 hover:bg-amber-100 has-[:checked]:bg-amber-100">
                                    <input
                                        type="radio"
                                        name="allocationChoice"
                                        className="mt-1 h-4 w-4 accent-primary"
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
                            size="lg"
                            className="w-full rounded-lg"
                            disabled={!canSubmit}
                            onClick={handlePayment}
                        >
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : (
                                <>
                                    <Check className="h-4 w-4" />
                                    {dueMonths.length > 0 ? 'Clear Due Months' : 'Add Payment'}
                                </>
                            )}
                        </Button>
                    )}

                    {result && (
                        result.error ? (
                            <Notice tone="error" onClose={() => setResult(null)}>{result.error}</Notice>
                        ) : (
                            <Notice tone="success" onClose={() => setResult(null)}>
                                <p className="font-semibold">Payment darj ho gaya</p>
                                <ul className="mt-1 space-y-0.5">
                                    {result.allocated?.map((a, i) => (
                                        <li key={i}>{a.monthName ? `${a.monthName} ${a.year}` : `${a.year}-${a.month}`}: ₹{a.amount}</li>
                                    ))}
                                </ul>
                                {result.warning && (
                                    <p className="mt-2 rounded-lg bg-amber-100 p-2 text-amber-900">⚠ {result.warning}</p>
                                )}
                            </Notice>
                        )
                    )}
            </Panel>

            <Modal
                open={showRemarkDialog}
                onClose={() => setShowRemarkDialog(false)}
                title="Remarks aur month-wise amount"
                description="Har month ki rakam badal sakte hain - total paid amount ke barabar rehna chahiye."
                footer={
                    <>
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
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            type="text"
                            placeholder="Sab months ke liye ek remark"
                            value={globalRemark}
                            onChange={(e) => setGlobalRemark(e.target.value)}
                            className={`${inputCls} flex-1`}
                        />
                        <Button type="button" variant="outline" onClick={applyGlobalRemark} className="h-11 sm:h-10">
                            Sab par lagayein
                        </Button>
                    </div>
                    <div className="space-y-2.5">
                        {allocations.map(a => {
                            const monthKey = monthKeyOf(a);
                            return (
                                <div key={monthKey} className="space-y-2 rounded-xl bg-muted/60 p-3">
                                    <label className="text-sm font-semibold text-primary">
                                        {a.monthName} {a.year}
                                    </label>
                                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            step={1}
                                            placeholder="Amount"
                                            aria-label={`Amount for ${a.monthName} ${a.year}`}
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
                                            className={inputCls}
                                        />
                                        <Input
                                            type="text"
                                            placeholder="Remark (optional)"
                                            aria-label={`Remark for ${a.monthName} ${a.year}`}
                                            value={remarks[monthKey] || ''}
                                            onChange={(e) => setRemarks({ ...remarks, [monthKey]: e.target.value })}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={`rounded-xl px-3.5 py-2.5 text-sm ${totalsMatch ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-700'}`}>
                        Month-wise total: <strong>₹{allocatedTotal}</strong> of <strong>₹{amountNum || 0}</strong>
                        {!totalsMatch && ` — ₹${amountNum - allocatedTotal} unallocated`}
                    </div>
                </div>
            </Modal>
        </>
    );
}
