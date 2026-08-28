'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getPaymentEntries, updatePaymentEntry, deletePaymentEntry } from '@/app/actions/payments';
import { PaymentEntryRow } from '@/types';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

/** MM/DD/YYYY from the sheet -> DD/MM/YYYY, without rendering "Invalid Date". */
function formatDate(value: string) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB');
}

export function PaymentEntriesTable({ refreshTrigger }: { refreshTrigger?: number }) {
    const [entries, setEntries] = useState<PaymentEntryRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editEntry, setEditEntry] = useState<PaymentEntryRow | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);

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
        const result = await updatePaymentEntry(editEntry.rowIndex, editData, {
            timestamp: editEntry.timestamp,
            name: editEntry.name
        });

        setSaving(false);

        if (result.success) {
            setShowEditDialog(false);
            setEditEntry(null);
            loadEntries();
        } else {
            setEditError(result.error || 'Could not save the entry.');
        }
    };

    const handleDelete = async (entry: PaymentEntryRow) => {
        if (!confirm(`Delete entry for ${entry.name}?`)) return;

        setError(null);
        const result = await deletePaymentEntry(entry.rowIndex, {
            timestamp: entry.timestamp,
            name: entry.name
        });

        if (result.success) {
            loadEntries();
        } else {
            setError(result.error || 'Could not delete the entry.');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return (
        <>
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Recent Payment Entries</h2>

                {error && (
                    <div className="mb-3 p-3 rounded-md bg-red-100 text-red-800 text-sm flex items-center justify-between gap-3">
                        <span>{error}</span>
                        <Button size="sm" variant="outline" onClick={loadEntries}>Refresh</Button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center p-4">Loading...</div>
                ) : entries.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">No entries found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 whitespace-nowrap">Name</th>
                                        <th className="text-left p-2">Date</th>
                                        <th className="text-left p-2">Amount</th>
                                        <th className="text-left p-2">Month</th>
                                        <th className="text-left p-2">Remarks</th>
                                        <th className="text-right p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry) => (
                                        <tr key={entry.rowIndex} className="border-b hover:bg-muted/50">
                                            <td className="p-2 whitespace-nowrap">{entry.name}</td>
                                            <td className="p-2">{formatDate(entry.paymentDate)}</td>
                                            <td className="p-2">₹{entry.amount}</td>
                                            <td className="p-2">{entry.monthName}</td>
                                            <td className="p-2 text-xs text-muted-foreground">{entry.remarks || '-'}</td>
                                            <td className="p-2 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(entry)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(entry)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-red-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="px-3 py-1 text-sm">
                                    {page} / {totalPages}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Payment Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                        {editError && (
                            <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">{editError}</div>
                        )}
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={editData.name || ''}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Amount</label>
                            <Input
                                type="number"
                                min={1}
                                value={editData.amount || ''}
                                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Payment Date</label>
                            <Input
                                value={editData.paymentDate || ''}
                                onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })}
                                placeholder="MM/DD/YYYY"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Month (No.)</label>
                            <Input
                                type="number"
                                min={1}
                                max={12}
                                value={editData.month || ''}
                                onChange={(e) => setEditData({ ...editData, month: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Year</label>
                            <Input
                                type="number"
                                value={editData.year || ''}
                                onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Remarks</label>
                            <Input
                                value={editData.remarks || ''}
                                onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                            />
                        </div>
                        <div className="pb-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                value={editData.phone || ''}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1" disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} className="flex-1" disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
