'use client';

import { useState, useEffect } from 'react';
import { submitFormExpense, getFormExpenseEntries, updateFormExpenseEntry, deleteFormExpenseEntry } from '@/app/actions/formExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Receipt, Inbox, Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chip, EmptyState, Field, IconButton, Modal, Notice, Panel, SubmitButton, inputCls, selectCls, textareaCls, useConfirm } from '@/components/admin/ui';
import { formatDMY, formatDMYTime, istToday } from '@/lib/dates';
import { formatIndianCurrency } from '@/lib/utils';

interface FormExpensesClientProps {
    existingNames: string[];
    /** People (and the bank) who can hold Chanda money. */
    holders: string[];
    /** When the opening cash balances were taken (ISO), or null if not set up. */
    openingAsOf: string | null;
    /** First page of entries, read together with the page on the server. */
    initialEntries: any[];
}

const emptyForm = () => ({
    name: '',
    description: '',
    paymentDate: istToday(),
    amount: '',
    remark: '',
    head: 'SaqlainiApp',
    holder: ''
});

export function FormExpensesClient({ existingNames, holders, openingAsOf, initialEntries }: FormExpensesClientProps) {
    // Who has the Chanda money is tracked once opening balances exist (see lib/cash.ts).
    const tracking = !!openingAsOf && holders.length > 0;
    // Entries from before the openings are already counted in them - no holder.
    const needsHolder = (entry: { timestamp?: string }) => tracking && String(entry.timestamp ?? '') > (openingAsOf ?? '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [entries, setEntries] = useState<any[]>(initialEntries);
    const [editingRow, setEditingRow] = useState<any | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editMessage, setEditMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingRow, setDeletingRow] = useState<number | null>(null);
    const [selectedName, setSelectedName] = useState('');
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [confirm, confirmDialog] = useConfirm();

    useEffect(() => {
        if (selectedName && !showNewEntryForm) {
            setFormData({ ...emptyForm(), name: selectedName });
        }
    }, [selectedName, showNewEntryForm]);

    async function loadEntries() {
        const result = await getFormExpenseEntries(1, 50);
        setEntries(result.entries);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (tracking && formData.head === 'Chanda' && !formData.holder) {
            setMessage({ ok: false, text: 'Please choose "Kiske paas wale paise se kharch hua".' });
            return;
        }
        setLoading(true);
        setMessage(null);

        const submitData = new FormData();
        // Only a Chanda-head expense comes out of someone's Chanda money.
        submitData.append('holder', formData.head === 'Chanda' ? formData.holder : '');
        submitData.append('name', formData.name);
        submitData.append('description', formData.description);
        submitData.append('paymentDate', formData.paymentDate);
        submitData.append('amount', formData.amount);
        submitData.append('remark', formData.remark);
        submitData.append('head', formData.head);

        const result = await submitFormExpense(submitData);

        setLoading(false);
        if (result.success) {
            setMessage({ ok: true, text: 'Entry add ho gayi.' });
            setFormData(emptyForm());
            setSelectedName('');
            setShowNewEntryForm(false);
            loadEntries();
        } else {
            setMessage({ ok: false, text: result.error || 'Could not add the entry.' });
        }
    }

    async function handleUpdate() {
        if (!editingRow) return;
        setEditMessage('');
        setSaving(true);
        const result = await updateFormExpenseEntry(editingRow.rowIndex, editData, editingRow);
        setSaving(false);
        if (result.success) {
            setShowEditDialog(false);
            setEditingRow(null);
            setMessage({ ok: true, text: 'Entry update ho gayi.' });
            loadEntries();
        } else {
            setEditMessage(result.error || 'Could not save the entry.');
        }
    }

    function handleEdit(entry: any) {
        setEditingRow(entry);
        setEditData(entry);
        setEditMessage('');
        setShowEditDialog(true);
    }

    // The whole entry goes along so the server can confirm the row has not moved.
    async function handleDelete(entry: any) {
        if (deletingRow !== null) return;
        const ok = await confirm({
            title: 'Ye entry delete karein?',
            message: <><strong className="text-foreground">{entry.name}</strong> · ₹{entry.amount}{entry.paymentDate ? ` · ${formatDMY(entry.paymentDate)}` : ''}. Ye wapas nahi aayegi.</>,
            danger: true,
        });
        if (!ok) return;
        setMessage(null);
        setDeletingRow(entry.rowIndex);
        const result = await deleteFormExpenseEntry(entry.rowIndex, entry);
        setDeletingRow(null);
        if (result.success) {
            setMessage({ ok: true, text: 'Entry delete ho gayi.' });
            loadEntries();
        } else {
            setMessage({ ok: false, text: result.error || 'Could not delete the entry.' });
        }
    }

    const nameOptions = existingNames.map(n => ({
        value: n,
        label: n
    }));

    const formOpen = showNewEntryForm || !!selectedName;

    const headSelect = (value: string, onChange: (v: string) => void) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={selectCls}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="SaqlainiApp">SaqlainiApp</SelectItem>
                <SelectItem value="Chanda">Chanda</SelectItem>
            </SelectContent>
        </Select>
    );

    const holderSelect = (value: string, onChange: (v: string) => void) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={selectCls}>
                <SelectValue placeholder="Chuniye..." />
            </SelectTrigger>
            <SelectContent>
                {holders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
        </Select>
    );

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            {/* ---------- New entry ---------- */}
            <form onSubmit={handleSubmit}>
                <Panel title="Naya kharch" description="Category chuniye, phir rakam aur tareekh bharein." icon={Receipt} bodyClassName="space-y-4">
                    <Field label="Category" hint={!formOpen ? 'Category list mein na ho to search karke "+ Add New Entry" dabayein.' : undefined}>
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
                                setFormData(emptyForm());
                            }}
                            showImages={false}
                        />
                    </Field>

                    {formOpen && (
                        <>
                            {showNewEntryForm && (
                                <Field label="Naya category naam" required>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={inputCls} />
                                </Field>
                            )}

                            {!showNewEntryForm && selectedName && (
                                <div className="rounded-xl bg-muted/70 px-3.5 py-2.5 text-sm font-semibold">{formData.name}</div>
                            )}

                            <Field label="Description" required>
                                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className={textareaCls} />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Payment date" required>
                                    <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required className={inputCls} />
                                </Field>
                                <Field label="Amount (₹)" required>
                                    <Input type="number" inputMode="numeric" min={1} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className={inputCls} />
                                </Field>
                            </div>

                            <Field label="Head" required hint="Chanda ke paise se kharch hua ho to Chanda chuniye.">
                                {headSelect(formData.head, (value) => setFormData({ ...formData, head: value }))}
                            </Field>

                            {tracking && formData.head === 'Chanda' && (
                                <Field label="Kiske paas wale paise se kharch hua?" required>
                                    {holderSelect(formData.holder, (value) => setFormData({ ...formData, holder: value }))}
                                </Field>
                            )}

                            <Field label="Remark">
                                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} className={textareaCls} />
                            </Field>

                            <SubmitButton loading={loading} loadingText="Submitting...">Kharch add karein</SubmitButton>
                        </>
                    )}

                    {message && <Notice tone={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Notice>}
                </Panel>
            </form>

            {/* ---------- Recent entries ---------- */}
            <Panel
                title="Recent kharch"
                description={`Latest ${entries.length} entries`}
                icon={Inbox}
                flush
            >
                {entries.length === 0 ? (
                    <EmptyState icon={Inbox} title="Abhi koi kharch nahi" description="Upar se pehla kharch darj karein." />
                ) : (
                    <ul className="divide-y divide-border/60">
                        {entries.map((entry) => (
                            <li key={entry.rowIndex ?? entry.timestamp} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                                        <Chip tone={entry.head === 'Chanda' ? 'gold' : 'green'}>{entry.head || 'N/A'}</Chip>
                                    </div>
                                    {entry.description && <p className="mt-0.5 text-sm text-foreground/80">{entry.description}</p>}
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {entry.paymentDate ? formatDMY(entry.paymentDate) : '-'}
                                        <span className="mx-1.5 opacity-50">•</span>
                                        <span title="Entry time">{formatDMYTime(entry.timestamp)}</span>
                                    </div>
                                    {entry.remark && <p className="mt-1 text-xs text-foreground/70">{entry.remark}</p>}
                                    {entry.head === 'Chanda' && (entry.holder || needsHolder(entry)) && (
                                        <div className="mt-1.5">
                                            {entry.holder
                                                ? <Chip tone="green">Kiske paas se: {entry.holder}</Chip>
                                                : <Chip tone="red">Holder chuna nahi</Chip>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="text-base font-bold text-red-700">₹{formatIndianCurrency(Number(entry.amount) || 0)}</span>
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
                )}
            </Panel>

            {/* ---------- Edit ---------- */}
            <Modal
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                busy={saving}
                title="Kharch entry edit karein"
                description={editingRow ? `${editingRow.name}${editingRow.paymentDate ? ` · ${formatDMY(editingRow.paymentDate)}` : ''}` : undefined}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save changes'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {editMessage && <Notice tone="error">{editMessage}</Notice>}
                    <Field label="Category">
                        <Input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Description">
                        <Textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className={textareaCls} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Payment date">
                            <Input type="date" value={editData.paymentDate || ''} onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Amount (₹)">
                            <Input type="number" inputMode="numeric" value={editData.amount || ''} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Remark">
                        <Textarea value={editData.remark || ''} onChange={(e) => setEditData({ ...editData, remark: e.target.value })} className={textareaCls} />
                    </Field>
                    <Field label="Head">
                        {headSelect(editData.head || 'SaqlainiApp', (value) => setEditData({ ...editData, head: value }))}
                    </Field>
                    {tracking && editData.head === 'Chanda' && (needsHolder(editData) ? (
                        <Field label="Kiske paas wale paise se kharch hua?">
                            {holderSelect(editData.holder || '', (value) => setEditData({ ...editData, holder: value }))}
                        </Field>
                    ) : (
                        <Notice tone="info">
                            Ye entry opening cash balance se pehle ki hai - opening mein shamil hai, isliye &quot;Kiske paas se&quot; nahi chuna jata.
                        </Notice>
                    ))}
                </div>
            </Modal>

            {confirmDialog}
        </div>
    );
}
