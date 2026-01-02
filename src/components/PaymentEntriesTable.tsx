'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getPaymentEntries, updatePaymentEntry, deletePaymentEntry } from '@/app/actions/payments';
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaymentEntry {
    rowIndex: number;
    timestamp: string;
    name: string;
    paymentDate: string;
    amount: string;
    month: string;
    monthName: string;
    year: string;
    remarks: string;
    phone: string;
}

export function PaymentEntriesTable({ refreshTrigger }: { refreshTrigger?: number }) {
    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [editEntry, setEditEntry] = useState<PaymentEntry | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showEditDialog, setShowEditDialog] = useState(false);

    const loadEntries = async () => {
        setLoading(true);
        const result = await getPaymentEntries(page, perPage);
        setEntries(result.entries);
        setTotal(result.total);
        setLoading(false);
    };

    useEffect(() => {
        loadEntries();
    }, [page, refreshTrigger]);

    const handleEdit = (entry: PaymentEntry) => {
        setEditEntry(entry);
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

        const result = await updatePaymentEntry(editEntry.rowIndex, editData);
        if (result.success) {
            setShowEditDialog(false);
            loadEntries();
        }
    };

    const handleDelete = async (entry: PaymentEntry) => {
        if (!confirm(`Delete entry for ${entry.name}?`)) return;

        const result = await deletePaymentEntry(entry.rowIndex);
        if (result.success) {
            loadEntries();
        }
    };

    const totalPages = Math.ceil(total / perPage);

    return (
        <>
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Recent Payment Entries</h2>

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
                                            <td className="p-2">{entry.paymentDate}</td>
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
                                    disabled={page === 1}
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
                                    disabled={page === totalPages}
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Payment Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
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
                        <div>
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                value={editData.phone || ''}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
