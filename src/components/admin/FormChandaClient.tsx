'use client';

import { useState, useEffect } from 'react';
import { submitFormChanda, getFormChandaEntries, updateFormChandaEntry, deleteFormChandaEntry } from '@/app/actions/formChanda';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AdminNav } from '@/components/admin/AdminNav';

interface FormChandaClientProps {
    existingNames: Array<{ name: string; nameHindi: string }>;
}

export function FormChandaClient({ existingNames }: FormChandaClientProps) {
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
        nameHindi: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        remarks: ''
    });

    useEffect(() => {
        loadEntries();
    }, []);

    useEffect(() => {
        if (selectedName && !showNewEntryForm) {
            const found = existingNames.find(n => n.name === selectedName);
            if (found) {
                setFormData({
                    name: found.name,
                    nameHindi: found.nameHindi,
                    paymentDate: new Date().toISOString().split('T')[0],
                    amount: '',
                    remarks: ''
                });
            }
        }
    }, [selectedName, showNewEntryForm, existingNames]);

    async function loadEntries() {
        const result = await getFormChandaEntries(1, 50);
        setEntries(result.entries);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('nameHindi', formData.nameHindi);
        submitData.append('paymentDate', formData.paymentDate);
        submitData.append('amount', formData.amount);
        submitData.append('remarks', formData.remarks);

        const result = await submitFormChanda(submitData);

        setLoading(false);
        if (result.success) {
            setMessage('✓ Entry added successfully!');
            setFormData({
                name: '',
                nameHindi: '',
                paymentDate: new Date().toISOString().split('T')[0],
                amount: '',
                remarks: ''
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
        const result = await updateFormChandaEntry(editingRow.rowIndex, editData);
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
            await deleteFormChandaEntry(rowIndex);
            loadEntries();
        }
    }

    const nameOptions = existingNames.map(n => ({
        value: n.name,
        label: `${n.name} (${n.nameHindi})`
    }));

    return (
        <main className="container max-w-md mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold" style={{ color: '#0D483B' }}>Form Chanda Entry</h1>
                <AdminNav />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-[15px] p-6 mb-6" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <div className="space-y-2">
                    <label className="block text-sm font-bold" style={{ color: '#4A3728' }}>Select Name</label>
                    <SearchableSelect
                        options={nameOptions}
                        value={selectedName}
                        onChange={(value) => {
                            setSelectedName(value);
                            setShowNewEntryForm(false);
                        }}
                        placeholder="Search and select name..."
                        onNewEntry={() => {
                            setShowNewEntryForm(true);
                            setSelectedName('');
                            setFormData({
                                name: '',
                                nameHindi: '',
                                paymentDate: new Date().toISOString().split('T')[0],
                                amount: '',
                                remarks: ''
                            });
                        }}
                        showImages={false}
                    />
                </div>

                {(showNewEntryForm || selectedName) && (
                    <>
                        {showNewEntryForm && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Name (English) *</label>
                                    <Input 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required 
                                        className="rounded-[10px]" 
                                        style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Name (Hindi) *</label>
                                    <Input 
                                        value={formData.nameHindi}
                                        onChange={(e) => setFormData({...formData, nameHindi: e.target.value})}
                                        required 
                                        className="rounded-[10px]" 
                                        style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                                    />
                                </div>
                            </div>
                        )}

                        {!showNewEntryForm && selectedName && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                                <div className="font-bold">{formData.name}</div>
                                <div className="text-muted-foreground">{formData.nameHindi}</div>
                            </div>
                        )}

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
                            <label className="block text-sm font-bold mb-2" style={{ color: '#4A3728' }}>Remarks</label>
                            <Textarea 
                                value={formData.remarks}
                                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                                className="rounded-[10px]" 
                                style={{ background: 'white', border: '1px solid #E5D3AA' }} 
                            />
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
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Name Hindi</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Date</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Amount</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Remarks</th>
                                <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-sm" style={{ color: '#165E4B' }}>No entries found.</td>
                                </tr>
                            ) : entries.map((entry, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #E5D3AA' }}>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.timestamp}</td>
                                    <td className="p-3 text-xs" style={{ color: '#4A3728' }}>{entry.name}</td>
                                    <td className="p-3 text-xs" style={{ color: '#4A3728' }}>{entry.nameHindi}</td>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.paymentDate}</td>
                                    <td className="p-3 text-xs font-bold" style={{ color: '#059669' }}>₹{entry.amount}</td>
                                    <td className="p-3 text-xs" style={{ color: '#165E4B' }}>{entry.remarks}</td>
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
                        <DialogTitle>Edit Chanda Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium">Name (English)</label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Name (Hindi)</label>
                            <Input value={editData.nameHindi || ''} onChange={(e) => setEditData({...editData, nameHindi: e.target.value})} />
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
                            <label className="text-sm font-medium">Remarks</label>
                            <Textarea value={editData.remarks || ''} onChange={(e) => setEditData({...editData, remarks: e.target.value})} />
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
