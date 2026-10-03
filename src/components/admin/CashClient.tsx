'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CashPosition, CashTransfer, CashAdjustment, CashSettlement } from '@/lib/cash';
import { addCashHolder, updateCashHolderOpening, addCashTransfer, deleteCashTransfer, addCashAdjustment, deleteCashAdjustment, addCashSettlement, deleteCashSettlement } from '@/app/actions/cash';
import { ChandaHoldersCard, money } from '@/components/admin/ChandaHoldersCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { formatDMY, formatDMYTime, istToday } from '@/lib/dates';

const box = { background: '#FFF8E7', border: '1px solid #E5D3AA' };
const field = { background: 'white', border: '1px solid #E5D3AA' };

export function CashClient({ position, saqlainiAvailable, bankHolder }: {
    position: CashPosition;
    saqlainiAvailable: number | null;
    bankHolder: string;
}) {
    const router = useRouter();
    const names = position.holders.filter(h => h.listed).map(h => h.name);

    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    // Handover form
    const [transfer, setTransfer] = useState({ date: istToday(), from: '', to: '', amount: '', remarks: '' });
    // Adjustment form
    const emptyAdjustment = { date: istToday(), holder: '', direction: 'in' as 'in' | 'out', amount: '', reason: '' };
    const [adjustment, setAdjustment] = useState(emptyAdjustment);
    // Hisaab milaan form
    const emptySettlement = { date: istToday(), holder: '', amount: '', note: '' };
    const [settlement, setSettlement] = useState(emptySettlement);
    const settlementHolder = position.holders.find(h => h.name === settlement.holder);
    const settlementDiff = settlementHolder && settlement.amount !== '' ? Number(settlement.amount) - settlementHolder.balance : 0;
    // New name
    const [newName, setNewName] = useState('');
    // Opening edit
    const [openingEdit, setOpeningEdit] = useState<{ name: string; value: string } | null>(null);

    async function run(action: () => Promise<{ success?: boolean; error?: string; warning?: string }>, done: string, after?: () => void) {
        setBusy(true);
        setMessage(null);
        const result = await action();
        setBusy(false);
        if (result.success) {
            setMessage({ ok: true, text: result.warning ? `${done} ${result.warning}` : done });
            after?.();
            router.refresh();
        } else {
            setMessage({ ok: false, text: result.error || 'Something went wrong.' });
        }
    }

    const holderSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="rounded-[10px]" style={field}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {names.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
        </Select>
    );

    return (
        <>
            <ChandaHoldersCard position={position} saqlainiAvailable={saqlainiAvailable} bankHolder={bankHolder} showDetailsLink={false} />

            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Hisaab milaan: the day someone's money was checked, and what it came to */}
            <form
                className="space-y-3 rounded-[15px] p-6 mb-6"
                style={box}
                onSubmit={(e) => {
                    e.preventDefault();
                    run(() => addCashSettlement(settlement), 'Hisaab darj ho gaya.', () => setSettlement(emptySettlement));
                }}
            >
                <h3 className="text-lg font-bold" style={{ color: '#4A3728' }}>Hisaab milaan</h3>
                <p className="text-xs" style={{ color: '#8B7355' }}>
                    Jis din kisi ka hisaab hua, wo tareekh aur rakam yahan darj karein. Har aadmi ke naam ke saath &quot;Aakhri hisaab&quot; dikhega.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Kiska hisaab *</label>
                        {holderSelect(settlement.holder, v => setSettlement({ ...settlement, holder: v }), 'Chuniye...')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Date *</label>
                        <Input type="date" value={settlement.date} onChange={(e) => setSettlement({ ...settlement, date: e.target.value })} required className="rounded-[10px]" style={field} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Hisaab mein kitna nikla *</label>
                        <Input type="number" min={0} value={settlement.amount} onChange={(e) => setSettlement({ ...settlement, amount: e.target.value })} required className="rounded-[10px]" style={field} />
                        {settlementHolder && (
                            <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                                App ke hisaab se abhi: <strong>{money(settlementHolder.balance)}</strong>
                                {settlement.amount !== '' && Math.round(settlementDiff) !== 0 && (
                                    <span className="text-amber-800"> - farq {settlementDiff > 0 ? '+' : ''}{money(settlementDiff)} adjustment mein darj ho jayega, taaki balance {money(Number(settlement.amount))} ho jaye.</span>
                                )}
                                {settlement.amount !== '' && Math.round(settlementDiff) === 0 && <span className="text-green-700"> - bilkul mil raha hai.</span>}
                            </p>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Note</label>
                    <Input value={settlement.note} onChange={(e) => setSettlement({ ...settlement, note: e.target.value })} placeholder="Jaise: ledger se milaya" className="rounded-[10px]" style={field} />
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-[10px]" style={{ background: '#0D483B' }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hisaab darj karein'}
                </Button>
            </form>

            {position.settlements.length > 0 && (
                <div className="rounded-[15px] overflow-hidden mb-6" style={box}>
                    <h3 className="p-4 text-lg font-bold" style={{ color: '#4A3728', background: '#E5D3AA' }}>Hisaab history</h3>
                    <ul>
                        {position.settlements.map((s: CashSettlement) => (
                            <li key={`${s.rowIndex}-${s.timestamp}`} className="p-3 flex justify-between items-center gap-2 text-sm" style={{ borderTop: '1px solid #E5D3AA' }}>
                                <div>
                                    <div style={{ color: '#4A3728' }}><strong>{s.holder}</strong> · {formatDMY(s.date)}</div>
                                    <div className="text-xs" style={{ color: '#8B7355' }}>
                                        {Math.round(s.amount - s.appBalance) === 0
                                            ? 'App se bilkul mila'
                                            : `App mein ${money(s.appBalance)} tha, farq ${s.amount - s.appBalance > 0 ? '+' : ''}${money(s.amount - s.appBalance)}`}
                                        {s.note ? ` · ${s.note}` : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold" style={{ color: '#0D483B' }}>{money(s.amount)}</span>
                                    <Button size="sm" variant="ghost" disabled={busy}
                                        onClick={() => {
                                            if (!confirm(`Delete hisaab ${s.holder} ${formatDMY(s.date)} (${money(s.amount)})? Iska adjustment (agar bana tha) alag se delete karna hoga.`)) return;
                                            run(() => deleteCashSettlement(s.rowIndex, { timestamp: s.timestamp, holder: s.holder, amount: s.amount }), 'Hisaab record deleted.');
                                        }}>
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Handover */}
            <form
                className="space-y-3 rounded-[15px] p-6 mb-6"
                style={box}
                onSubmit={(e) => {
                    e.preventDefault();
                    run(
                        () => addCashTransfer(transfer),
                        'Handover saved.',
                        () => setTransfer({ date: istToday(), from: '', to: '', amount: '', remarks: '' })
                    );
                }}
            >
                <h3 className="text-lg font-bold" style={{ color: '#4A3728' }}>Paisa diya / Bank mein jama kiya</h3>
                <p className="text-xs" style={{ color: '#8B7355' }}>
                    Chanda ka paisa ek ke paas se doosre ke paas gaya - jaise Zahid ne Mushahid ko diya, ya bank mein jama kiya.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Kisne diya *</label>
                        {holderSelect(transfer.from, v => setTransfer({ ...transfer, from: v }), 'Chuniye...')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Kisko mila *</label>
                        {holderSelect(transfer.to, v => setTransfer({ ...transfer, to: v }), 'Chuniye...')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Amount *</label>
                        <Input type="number" min={1} value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} required className="rounded-[10px]" style={field} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Date *</label>
                        <Input type="date" value={transfer.date} onChange={(e) => setTransfer({ ...transfer, date: e.target.value })} required className="rounded-[10px]" style={field} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Remarks</label>
                    <Input value={transfer.remarks} onChange={(e) => setTransfer({ ...transfer, remarks: e.target.value })} className="rounded-[10px]" style={field} />
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-[10px]" style={{ background: '#0D483B' }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save handover'}
                </Button>
            </form>

            {/* Per-person breakdown */}
            <div className="rounded-[15px] overflow-hidden mb-6" style={box}>
                <h3 className="p-4 text-lg font-bold" style={{ color: '#4A3728', background: '#E5D3AA' }}>Har aadmi ka hisaab</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: '560px' }}>
                        <thead>
                            <tr style={{ color: '#4A3728' }}>
                                <th className="text-left p-2">Naam</th>
                                <th className="text-right p-2">Opening</th>
                                <th className="text-right p-2">Chanda mila</th>
                                <th className="text-right p-2">Kharch</th>
                                <th className="text-right p-2">Handover +</th>
                                <th className="text-right p-2">Handover −</th>
                                <th className="text-right p-2">Adjustment</th>
                                <th className="text-right p-2">Aakhri hisaab</th>
                                <th className="text-right p-2">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {position.holders.map(h => (
                                <tr key={h.name} style={{ borderTop: '1px solid #E5D3AA', color: '#165E4B' }}>
                                    <td className="p-2 font-medium" style={{ color: '#4A3728' }}>{h.name}</td>
                                    <td className="p-2 text-right whitespace-nowrap">
                                        {money(h.opening)}
                                        {h.listed && (
                                            <button type="button" className="ml-1 align-middle" title="Opening badlein"
                                                onClick={() => setOpeningEdit({ name: h.name, value: String(h.opening) })}>
                                                <Pencil className="inline h-3 w-3" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-2 text-right">{money(h.received)}</td>
                                    <td className="p-2 text-right">{money(h.spent)}</td>
                                    <td className="p-2 text-right">{money(h.transferredIn)}</td>
                                    <td className="p-2 text-right">{money(h.transferredOut)}</td>
                                    <td className="p-2 text-right">{h.adjusted > 0 ? '+' : ''}{money(h.adjusted)}</td>
                                    <td className="p-2 text-right whitespace-nowrap">
                                        {h.lastSettlement ? `${formatDMY(h.lastSettlement.date)} · ${money(h.lastSettlement.amount)}` : '-'}
                                    </td>
                                    <td className={`p-2 text-right font-bold ${h.balance < 0 ? 'text-red-600' : ''}`}>{money(h.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {position.openingAsOf && (
                    <p className="p-3 text-[11px]" style={{ color: '#8B7355' }}>
                        Opening balance {formatDMYTime(position.openingAsOf)} ke hisaab se. Usse pehle ki entries opening mein shamil hain.
                    </p>
                )}
            </div>

            {/* Entries made after the openings without a holder */}
            {position.unassignedEntries.length > 0 && (
                <div className="rounded-[15px] p-4 mb-6 bg-amber-50 border border-amber-300">
                    <h3 className="font-bold text-amber-900 mb-2">In entries mein &quot;Paisa kiske paas&quot; nahi chuna gaya</h3>
                    <p className="text-xs text-amber-800 mb-2">Chanda / Expenses page par Edit karke holder chuniye.</p>
                    <ul className="text-xs space-y-1 text-amber-900">
                        {position.unassignedEntries.map((e, i) => (
                            <li key={i}>{e.kind === 'chanda' ? 'Chanda' : 'Kharch'} · {formatDMY(e.date)} · {e.name} · {money(e.amount)}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Adjustment: correct what one person holds - never touches the public totals */}
            <form
                className="space-y-3 rounded-[15px] p-6 mb-6"
                style={box}
                onSubmit={(e) => {
                    e.preventDefault();
                    run(() => addCashAdjustment(adjustment), 'Adjustment saved.', () => setAdjustment(emptyAdjustment));
                }}
            >
                <h3 className="text-lg font-bold" style={{ color: '#4A3728' }}>Adjustment - paise daale / nikaale</h3>
                <p className="text-xs" style={{ color: '#8B7355' }}>
                    Kisi ke paas asal mein jitna paisa hai, use yahan theek karein. Iska asar sirf us aadmi ke hisaab par hota hai -
                    public page ke Chanda / SaqlainiApp total waise hi asli entries se bante rahenge.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Kiske paas *</label>
                        {holderSelect(adjustment.holder, v => setAdjustment({ ...adjustment, holder: v }), 'Chuniye...')}
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Kya hua *</label>
                        <Select value={adjustment.direction} onValueChange={(v) => setAdjustment({ ...adjustment, direction: v as 'in' | 'out' })}>
                            <SelectTrigger className="rounded-[10px]" style={field}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in">Paise daale (+)</SelectItem>
                                <SelectItem value="out">Paise nikaale (−)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Amount *</label>
                        <Input type="number" min={1} value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} required className="rounded-[10px]" style={field} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Date *</label>
                        <Input type="date" value={adjustment.date} onChange={(e) => setAdjustment({ ...adjustment, date: e.target.value })} required className="rounded-[10px]" style={field} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#4A3728' }}>Karan (zaroori) *</label>
                    <Input value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} required placeholder="Jaise: passbook se milaya, cash ginti mein kam nikla..." className="rounded-[10px]" style={field} />
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-[10px]" style={{ background: '#0D483B' }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save adjustment'}
                </Button>
            </form>

            {position.adjustments.length > 0 && (
                <div className="rounded-[15px] overflow-hidden mb-6" style={box}>
                    <h3 className="p-4 text-lg font-bold" style={{ color: '#4A3728', background: '#E5D3AA' }}>Adjustment history</h3>
                    <ul>
                        {position.adjustments.map((a: CashAdjustment) => (
                            <li key={`${a.rowIndex}-${a.timestamp}`} className="p-3 flex justify-between items-center gap-2 text-sm" style={{ borderTop: '1px solid #E5D3AA' }}>
                                <div>
                                    <div style={{ color: '#4A3728' }}><strong>{a.holder}</strong></div>
                                    <div className="text-xs" style={{ color: '#8B7355' }}>{formatDMY(a.date)} · {a.reason}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${a.amount < 0 ? 'text-red-600' : ''}`} style={a.amount < 0 ? undefined : { color: '#0D483B' }}>
                                        {a.amount > 0 ? '+' : ''}{money(a.amount)}
                                    </span>
                                    <Button size="sm" variant="ghost" disabled={busy}
                                        onClick={() => {
                                            if (!confirm(`Delete adjustment ${a.holder} (${money(a.amount)})?`)) return;
                                            run(() => deleteCashAdjustment(a.rowIndex, { timestamp: a.timestamp, holder: a.holder, amount: a.amount }), 'Adjustment deleted.');
                                        }}>
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Handover history */}
            <div className="rounded-[15px] overflow-hidden mb-6" style={box}>
                <h3 className="p-4 text-lg font-bold" style={{ color: '#4A3728', background: '#E5D3AA' }}>Handover history</h3>
                {position.transfers.length === 0 ? (
                    <p className="p-4 text-sm" style={{ color: '#165E4B' }}>Abhi koi handover nahi.</p>
                ) : (
                    <ul>
                        {position.transfers.slice(0, 50).map((t: CashTransfer) => (
                            <li key={`${t.rowIndex}-${t.timestamp}`} className="p-3 flex justify-between items-center gap-2 text-sm" style={{ borderTop: '1px solid #E5D3AA' }}>
                                <div>
                                    <div style={{ color: '#4A3728' }}>
                                        <strong>{t.from}</strong> → <strong>{t.to}</strong>
                                    </div>
                                    <div className="text-xs" style={{ color: '#8B7355' }}>
                                        {formatDMY(t.date)}{t.remarks ? ` · ${t.remarks}` : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold" style={{ color: '#0D483B' }}>{money(t.amount)}</span>
                                    <Button size="sm" variant="ghost" disabled={busy}
                                        onClick={() => {
                                            if (!confirm(`Delete handover ${t.from} → ${t.to} (${money(t.amount)})?`)) return;
                                            run(() => deleteCashTransfer(t.rowIndex, { timestamp: t.timestamp, from: t.from, to: t.to, amount: t.amount }), 'Handover deleted.');
                                        }}>
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* New name */}
            <form
                className="rounded-[15px] p-6 mb-6 space-y-3"
                style={box}
                onSubmit={(e) => {
                    e.preventDefault();
                    run(() => addCashHolder(newName), 'Name added.', () => setNewName(''));
                }}
            >
                <h3 className="text-lg font-bold" style={{ color: '#4A3728' }}>Naya naam jodein</h3>
                <p className="text-xs" style={{ color: '#8B7355' }}>
                    Naya aadmi ₹0 se shuru hota hai. Use paisa dena ho to upar &quot;Paisa diya&quot; se handover darj karein.
                </p>
                <div className="flex gap-2">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Naam" required className="rounded-[10px]" style={field} />
                    <Button type="submit" disabled={busy} style={{ background: '#0D483B' }}>Add</Button>
                </div>
            </form>

            <Dialog open={!!openingEdit} onOpenChange={(open) => { if (!open) setOpeningEdit(null); }}>
                <DialogContent className="max-w-[95vw] sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Opening balance - {openingEdit?.name}</DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground">
                        Sirf galti sudhaarne ke liye. Paisa ek se doosre ke paas gaya ho to handover darj karein.
                    </p>
                    <Input type="number" value={openingEdit?.value ?? ''} onChange={(e) => setOpeningEdit(o => o && { ...o, value: e.target.value })} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpeningEdit(null)}>Cancel</Button>
                        <Button disabled={busy} onClick={() => {
                            if (!openingEdit) return;
                            const edit = openingEdit;
                            run(() => updateCashHolderOpening(edit.name, Number(edit.value)), 'Opening updated.', () => setOpeningEdit(null));
                        }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
