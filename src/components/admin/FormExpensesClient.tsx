'use client';

import { useState, useEffect } from 'react';
import { submitFormExpense, getFormExpenseEntries, updateFormExpenseEntry, deleteFormExpenseEntry } from '@/app/actions/formExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AdminNav } from '@/components/admin/AdminNav';

interface FormExpensesClientProps {
    existingNames: string[];
}

export function FormExpensesClient({ existingNames }: FormExpensesClientProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [entries, setEntries] = useState<any[]>([]);
    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedName, setSelectedName] = useState('');
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        remark: '',
        head: 'SaqlainiApp'
    });

    useEffect(() => {
        loadEntries();
    }, []);

    useEffect(() => {
        if (selectedName && !showNewEntryForm) {
            setFormData({
                name: selectedName,
                description: '',
                paymentDate: new Date().toISOString().split('T')[0],
                amount: '',
                remark: '',
                head: 'SaqlainiApp'
            });
        }
    }, [selectedName, showNewEntryForm]);

    async function loadEntries() {
        const result = await getFormExpenseEntries(1, 50);
        setEntries(result.entries);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('description', formData.description);
        submitData.append('paymentDate', formData.paymentDate);
        submitData.append('amount', formData.amount);
        submitData.append('remark', formData.remark);
        submitData.append('head', formData.head);

        const result = await submitFormExpense(submitData);

        setLoading(false);
        if (result.success) {
            setMessage('✓ Entry added successfully!');
            setFormData({
                name: '',
                description: '',
                paymentDate: new Date().toISOString().split('T')[0],
                amount: '',
                remark: '',
                head: 'SaqlainiApp'
            });
            setSelectedName('');
            setShowNewEntryForm(false);
            loadEntries();
        } else {
            setMessage('✗ Error: ' + result.error);
        }
    }

    async function handleUpdate() {
        if (!editingRow) return;
        const result = await updateFormExpenseEntry(editingRow.rowIndex, editData);
        if (result.success) {
            setShowEditDialog(false);
            setEditingRow(null);
            loadEntries();
        }
    }

    function handleEdit(entry: any) {
        setEditingRow(entry);
        setEditData(entry);
        setShowEditDialog(true);
    }

    async function handleDelete(rowIndex: number) {
        if (confirm('Delete this entry?')) {
            await deleteFormExpenseEntry(rowIndex);
            loadEntries();
        }
    }

    const nameOptions = existingNames.map(n => ({
        value: n,
        label: n
    }));

    return (
        <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold" style={{ color: '#0D483B' }}>Form Expenses Entry</h1>
                <AdminNav />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-[15px] p-6 mb-6" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <div className="space-y-2">
                    <label className="block text-sm font-bold" style={{ color: '#4A3728' }}>Select Category</label>
                    <SearchableSelect
                        options={nameOptions}
                        value={selectedName}
                        onChange={(value) => {
                            setSelectedName(value);
                            setShowNewEntryForm(false);
                        }}
                        placeholder="Search and select category..."
                        onNewEntry={() => {
                            setShowNewEntryForm(true);
                            setSelectedName('');
                            setFormData({
                                name: '',
                                description: '',
                                paymentDate: new Date().toISOString().split('T')[0],
                                amount: '',
                                remark: '',
                                head: 'SaqlainiApp'
                            });
                        }}
                        showImages={false}
                    />
                </div>

                {(showNewEntryForm || selectedName) && (
                    <>
                        {showNewEntryForm && (
                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Name *</label>
                                <Input 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required 
                                    className="rounded-[10px]" 
                                    style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                                />
                            </div>
                        )}

                        {!showNewEntryForm && selectedName && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                                <div className="font-bold">{formData.name}</div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Description *</label>
                            <Textarea 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required 
                                className="rounded-[10px]" 
                                style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Payment Date *</label>
                                <Input 
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                                    required 
                                    className="rounded-[10px]" 
                                    style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Amount *</label>
                                <Input 
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    required 
                                    className="rounded-[10px]" 
                                    style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Remark</label>
                            <Textarea 
                                value={formData.remark}
                                onChange={(e) => setFormData({...formData, remark: e.target.value})}
                                className="rounded-[10px]" 
                                style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Head *</label>
                            <Select value={formData.head} onValueChange={(value) => setFormData({...formData, head: value})}>
                                <SelectTrigger className="rounded-[10px]" style={{ background: 'white', border: '1px solid #E5D3AA' }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SaqlainiApp">SaqlainiApp</SelectItem>
                                    <SelectItem value="Chanda">Chanda</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full rounded-[10px]" style={{ background: '#0D483B' }}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit'}
                        </Button>
                    </>
                )}

                {message && <p className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            </form>

            <div className="rounded-[15px] overflow-hidden" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: '#E5D3AA' }}>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Timestamp</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Name</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Description</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Date</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Amount</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Remark</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Head</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-sm" style={{ color: '#165E4B' }}>No entries found.</td>
                                </tr>
                            ) : entries.map((entry, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #E5D3AA' }}>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.timestamp}</td>
                                    <td className="p-3 text-xs" style={{ color: '#4A3728' }}>{entry.name}</td>
                                    <td className="p-3 text-xs" style={{ color: '#4A3728' }}>{entry.description}</td>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.paymentDate}</td>
                                    <td className="p-3 text-xs font-bold" style={{ color: '#059669' }}>₹{entry.amount}</td>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.remark}</td>
                                    <td className="p-3 text-xs" style={{ color: '#4A3728' }}>{entry.head}</td>
                                    <td className="p-3">
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}><Edit className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.rowIndex)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Expense Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea value={editData.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Payment Date</label>
                            <Input type="date" value={editData.paymentDate || ''} onChange={(e) => setEditData({...editData, paymentDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Amount</label>
                            <Input type="number" value={editData.amount || ''} onChange={(e) => setEditData({...editData, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Remark</label>
                            <Textarea value={editData.remark || ''} onChange={(e) => setEditData({...editData, remark: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Head</label>
                            <Select value={editData.head || 'SaqlainiApp'} onValueChange={(value) => setEditData({...editData, head: value})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SaqlainiApp">SaqlainiApp</SelectItem>
                                    <SelectItem value="Chanda">Chanda</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
