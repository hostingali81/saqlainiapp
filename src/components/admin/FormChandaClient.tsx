'use client';

import { useState, useEffect } from 'react';
import { submitFormChanda, getFormChandaEntries, updateFormChandaEntry, deleteFormChandaEntry } from '@/app/actions/formChanda';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, HandCoins, Inbox, Loader2, UserPlus } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chip, EmptyState, Field, IconButton, Modal, Notice, Panel, SubmitButton, inputCls, selectCls, textareaCls, useConfirm } from '@/components/admin/ui';
import { formatDMY, formatDMYTime, istToday } from '@/lib/dates';
import { formatIndianCurrency } from '@/lib/utils';

interface FormChandaClientProps {
    existingNames: Array<{ name: string; nameHindi: string }>;
    /** People (and the bank) who can hold Chanda money. */
    holders: string[];
    /** When the opening cash balances were taken (ISO), or null if not set up. */
    openingAsOf: string | null;
    /** First page of entries, read together with the page on the server. */
    initialEntries: any[];
}

const emptyForm = () => ({
    name: '',
    nameHindi: '',
    paymentDate: istToday(),
    amount: '',
    remarks: '',
    holder: ''
});

export function FormChandaClient({ existingNames, holders, openingAsOf, initialEntries }: FormChandaClientProps) {
    // Who has the money is tracked once opening balances exist (see lib/cash.ts).
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
            const found = existingNames.find(n => n.name === selectedName);
            if (found) {
                setFormData({ ...emptyForm(), name: found.name, nameHindi: found.nameHindi });
            }
        }
    }, [selectedName, showNewEntryForm, existingNames]);

    async function loadEntries() {
        const result = await getFormChandaEntries(1, 50);
        setEntries(result.entries);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (tracking && !formData.holder) {
            setMessage({ ok: false, text: 'Please choose "Paisa kiske paas gaya".' });
            return;
        }
        setLoading(true);
        setMessage(null);

        const submitData = new FormData();
        submitData.append('holder', formData.holder);
        submitData.append('name', formData.name);
        submitData.append('nameHindi', formData.nameHindi);
        submitData.append('paymentDate', formData.paymentDate);
        submitData.append('amount', formData.amount);
        submitData.append('remarks', formData.remarks);

        const result = await submitFormChanda(submitData);

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
        const result = await updateFormChandaEntry(editingRow.rowIndex, editData, editingRow);
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
            message: <><strong className="text-foreground">{entry.name}</strong> · ₹{entry.amount} · {formatDMY(entry.paymentDate)}. Ye wapas nahi aayegi.</>,
            danger: true,
        });
        if (!ok) return;
        setMessage(null);
        setDeletingRow(entry.rowIndex);
        const result = await deleteFormChandaEntry(entry.rowIndex, entry);
        setDeletingRow(null);
        if (result.success) {
            setMessage({ ok: true, text: 'Entry delete ho gayi.' });
            loadEntries();
        } else {
            setMessage({ ok: false, text: result.error || 'Could not delete the entry.' });
        }
    }

    const nameOptions = existingNames.map(n => ({
        value: n.name,
        label: `${n.name} (${n.nameHindi})`
    }));

    const formOpen = showNewEntryForm || !!selectedName;

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            {/* ---------- New entry ---------- */}
            <form onSubmit={handleSubmit}>
                <Panel title="Nayi chanda entry" description="Naam chuniye, phir rakam aur tareekh bharein." icon={HandCoins} bodyClassName="space-y-4">
                    <Field label="Naam" hint={!formOpen ? 'Naam list mein na ho to search karke "+ Add New Entry" dabayein.' : undefined}>
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
                                setFormData(emptyForm());
                            }}
                            showImages={false}
                        />
                    </Field>

                    {formOpen && (
                        <>
                            {showNewEntryForm && (
                                <div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                        <UserPlus className="h-3.5 w-3.5" /> Naya naam
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Name (English)" required>
                                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={inputCls} />
                                        </Field>
                                        <Field label="Name (Hindi)" required>
                                            <Input value={formData.nameHindi} onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })} required className={inputCls} />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {!showNewEntryForm && selectedName && (
                                <div className="rounded-xl bg-muted/70 px-3.5 py-2.5">
                                    <div className="text-sm font-semibold">{formData.name}</div>
                                    <div className="text-xs text-muted-foreground">{formData.nameHindi}</div>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Payment date" required>
                                    <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required className={inputCls} />
                                </Field>
                                <Field label="Amount (₹)" required>
                                    <Input type="number" inputMode="numeric" min={1} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className={inputCls} />
                                </Field>
                            </div>

                            {tracking && (
                                <Field label="Paisa kiske paas gaya?" required hint="Account transfer hua ho to bank wala chuniye.">
                                    <Select value={formData.holder} onValueChange={(value) => setFormData({ ...formData, holder: value })}>
                                        <SelectTrigger className={selectCls}>
                                            <SelectValue placeholder="Chuniye..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {holders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}

                            <Field label="Remarks">
                                <Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className={textareaCls} />
                            </Field>

                            <SubmitButton loading={loading} loadingText="Submitting...">Entry add karein</SubmitButton>
                        </>
                    )}

                    {message && <Notice tone={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Notice>}
                </Panel>
            </form>

            {/* ---------- Recent entries ---------- */}
            <Panel
                title="Recent entries"
                description={`Latest ${entries.length} entries`}
                icon={Inbox}
                flush
            >
                {entries.length === 0 ? (
                    <EmptyState icon={Inbox} title="Abhi koi entry nahi" description="Upar se pehli chanda entry darj karein." />
                ) : (
                    <ul className="divide-y divide-border/60">
                        {entries.map((entry) => (
                            <li key={entry.rowIndex ?? entry.timestamp} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2">
                                        <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                                        {entry.nameHindi && <span className="text-xs text-muted-foreground">{entry.nameHindi}</span>}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {formatDMY(entry.paymentDate)}
                                        <span className="mx-1.5 opacity-50">•</span>
                                        <span title="Entry time">{formatDMYTime(entry.timestamp)}</span>
                                    </div>
                                    {entry.remarks && <p className="mt-1 text-xs text-foreground/70">{entry.remarks}</p>}
                                    {(entry.holder || needsHolder(entry)) && (
                                        <div className="mt-1.5">
                                            {entry.holder
                                                ? <Chip tone="green">Kiske paas: {entry.holder}</Chip>
                                                : <Chip tone="red">Holder chuna nahi</Chip>}
                                        </div>
                                    )}
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
                )}
            </Panel>

            {/* ---------- Edit ---------- */}
            <Modal
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                busy={saving}
                title="Chanda entry edit karein"
                description={editingRow ? `${editingRow.name} · ${formatDMY(editingRow.paymentDate)}` : undefined}
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Name (English)">
                            <Input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Name (Hindi)">
                            <Input value={editData.nameHindi || ''} onChange={(e) => setEditData({ ...editData, nameHindi: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Payment date">
                            <Input type="date" value={editData.paymentDate || ''} onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Amount (₹)">
                            <Input type="number" inputMode="numeric" value={editData.amount || ''} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Remarks">
                        <Textarea value={editData.remarks || ''} onChange={(e) => setEditData({ ...editData, remarks: e.target.value })} className={textareaCls} />
                    </Field>
                    {tracking && (needsHolder(editData) ? (
                        <Field label="Paisa kiske paas gaya?">
                            <Select value={editData.holder || ''} onValueChange={(value) => setEditData({ ...editData, holder: value })}>
                                <SelectTrigger className={selectCls}>
                                    <SelectValue placeholder="Chuniye..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {holders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    ) : (
                        <Notice tone="info">
                            Ye entry opening cash balance se pehle ki hai - opening mein shamil hai, isliye &quot;Kiske paas&quot; nahi chuna jata.
                        </Notice>
                    ))}
                </div>
            </Modal>

            {confirmDialog}
        </div>
    );
}
