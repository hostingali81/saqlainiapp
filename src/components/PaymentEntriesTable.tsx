'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip, EmptyState, Field, IconButton, ListSkeleton, Modal, Notice, Panel, inputCls, useConfirm } from '@/components/admin/ui';
import { getPaymentEntries, updatePaymentEntry, deletePaymentEntry } from '@/app/actions/payments';
import { PaymentEntryRow } from '@/types';
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, ReceiptText, Inbox } from 'lucide-react';
import { formatDMY, formatMonthYY } from '@/lib/dates';
import { formatIndianCurrency } from '@/lib/utils';

/** Entry dates arrive as ISO (see getPaymentEntries) -> DD/MM/YYYY. */
function formatDate(value: string) {
    return value ? formatDMY(value) : '-';
}

/** What the server re-checks before touching a row (see verifySheetRow). */
function rowGuard(entry: PaymentEntryRow) {
    return {
        timestamp: entry.timestamp,
        name: entry.name,
        amount: entry.amount,
        month: entry.month,
        year: entry.year
    };
}

export function PaymentEntriesTable({ refreshTrigger, onDataChanged }: {
    refreshTrigger?: number;
    /** Edits and deletes re-sync the database, so the page's member data changes too. */
    onDataChanged?: () => void;
}) {
    const [entries, setEntries] = useState<PaymentEntryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    // A delete now also re-syncs the app and takes a few seconds; block a
    // second click on the same (already shifting) list meanwhile.
    const [deletingRow, setDeletingRow] = useState<number | null>(null);
    const [editEntry, setEditEntry] = useState<PaymentEntryRow | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await getPaymentEntries(page, perPage);
        if (result.error) setError(result.error);
        setEntries(result.entries);
        setTotal(result.total);
        // The server clamps the page (e.g. after deleting the last row of the
        // last page); mirror it so the controls stay in sync.
        if (result.page !== page) setPage(result.page);
        setLoading(false);
    }, [page, perPage]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries, refreshTrigger]);

    const handleEdit = (entry: PaymentEntryRow) => {
        setEditEntry(entry);
        setEditError(null);
        setEditData({
            timestamp: entry.timestamp,
            name: entry.name,
            paymentDate: entry.paymentDate,
            amount: entry.amount,
            month: entry.month,
            monthName: entry.monthName,
            year: entry.year,
            remarks: entry.remarks,
            phone: entry.phone
        });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!editEntry) return;

        setSaving(true);
        setEditError(null);

        // The original values identify the row; `editData` may have been changed.
        const result = await updatePaymentEntry(editEntry.rowIndex, editData, rowGuard(editEntry));

        setSaving(false);

        if (result.success) {
            setShowEditDialog(false);
            setEditEntry(null);
            setWarning(result.warning || null);
            loadEntries();
            onDataChanged?.();
        } else {
            setEditError(result.error || 'Could not save the entry.');
        }
    };

    const handleDelete = async (entry: PaymentEntryRow) => {
        if (deletingRow !== null) return;
        const ok = await confirm({
            title: 'Ye payment entry delete karein?',
            message: <><strong className="text-foreground">{entry.name}</strong> · ₹{entry.amount}{entry.monthName ? ` · ${formatMonthYY(entry.monthName)}` : ''}. Member ke due months bhi dobara sync honge.</>,
            danger: true,
        });
        if (!ok) return;

        setError(null);
        setWarning(null);
        setDeletingRow(entry.rowIndex);
        const result = await deletePaymentEntry(entry.rowIndex, rowGuard(entry));
        setDeletingRow(null);

        if (result.success) {
            setWarning(result.warning || null);
            loadEntries();
            onDataChanged?.();
        } else {
            setError(result.error || 'Could not delete the entry.');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return (
        <>
            <Panel
                title="Recent payment entries"
                description={loading || total === 0 ? undefined : `${total} entries in total`}
                icon={ReceiptText}
                flush
            >
                {error && (
                    <div className="border-b border-border/60 p-3">
                        <Notice tone="error">
                            <div className="flex items-center justify-between gap-3">
                                <span>{error}</span>
                                <Button size="sm" variant="outline" onClick={loadEntries}>Refresh</Button>
                            </div>
                        </Notice>
                    </div>
                )}

                {warning && (
                    <div className="border-b border-border/60 p-3">
                        <Notice tone="warning" onClose={() => setWarning(null)}>{warning}</Notice>
                    </div>
                )}

                {loading && entries.length === 0 ? (
                    <ListSkeleton rows={5} />
                ) : entries.length === 0 ? (
                    <EmptyState icon={Inbox} title="Abhi koi entry nahi" description="Payment darj hote hi yahan dikhegi." />
                ) : (
                    <>
                        <ul className={`divide-y divide-border/60 transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading}>
                            {entries.map((entry) => (
                                <li key={entry.rowIndex} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                                            {entry.monthName && <Chip tone="green">{formatMonthYY(entry.monthName)}</Chip>}
                                        </div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.paymentDate)}</div>
                                        {entry.remarks && <p className="mt-1 text-xs text-foreground/70">{entry.remarks}</p>}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-base font-bold text-emerald-700">₹{formatIndianCurrency(Number(entry.amount) || 0)}</span>
                                        <div className="-mr-2 flex">
                                            <IconButton label={`Edit ${entry.name}`} onClick={() => handleEdit(entry)}>
                                                <Pencil className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton label={`Delete ${entry.name}`} tone="danger" onClick={() => handleDelete(entry)} disabled={deletingRow !== null}>
                                                {deletingRow === entry.rowIndex ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </IconButton>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Pagination */}
                        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
                            <div className="text-xs text-muted-foreground">
                                {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button size="icon-sm" variant="outline" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="min-w-14 text-center text-xs font-medium">{page} / {totalPages}</span>
                                <Button size="icon-sm" variant="outline" aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Panel>

            {/* Edit */}
            <Modal
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                busy={saving}
                title="Payment entry edit karein"
                description={editEntry ? `${editEntry.name} · ${formatDate(editEntry.paymentDate)}` : undefined}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save changes'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {editError && <Notice tone="error">{editError}</Notice>}
                    <Field label="Name">
                        <Input className={inputCls} value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Amount (₹)">
                            <Input className={inputCls} type="number" inputMode="numeric" min={1} value={editData.amount || ''} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} />
                        </Field>
                        {/* A date picker works in ISO, which is exactly what the
                            server expects - no typed text to misread. */}
                        <Field label="Payment date">
                            <Input className={inputCls} type="date" value={editData.paymentDate || ''} onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })} />
                        </Field>
                        <Field label="Month (1-12)">
                            <Input className={inputCls} type="number" inputMode="numeric" min={1} max={12} value={editData.month || ''} onChange={(e) => setEditData({ ...editData, month: e.target.value })} />
                        </Field>
                        <Field label="Year">
                            <Input className={inputCls} type="number" inputMode="numeric" value={editData.year || ''} onChange={(e) => setEditData({ ...editData, year: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Remarks">
                        <Input className={inputCls} value={editData.remarks || ''} onChange={(e) => setEditData({ ...editData, remarks: e.target.value })} />
                    </Field>
                    <Field label="Phone number">
                        <Input className={inputCls} type="tel" inputMode="tel" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                    </Field>
                </div>
            </Modal>

            {confirmDialog}
        </>
    );
}
