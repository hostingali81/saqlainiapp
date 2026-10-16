'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CashPosition, CashTransfer, CashAdjustment, CashSettlement } from '@/lib/cash';
import { addCashHolder, updateCashHolderOpening, addCashTransfer, deleteCashTransfer, addCashAdjustment, deleteCashAdjustment, addCashSettlement, deleteCashSettlement } from '@/app/actions/cash';
import { ChandaHoldersCard, money } from '@/components/admin/ChandaHoldersCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, Field, IconButton, Modal, Notice, Panel, SubmitButton, inputCls, selectCls, useConfirm } from '@/components/admin/ui';
import { ArrowRightLeft, ClipboardCheck, Loader2, Pencil, Scale, Trash2, UserPlus, Users, History, ChevronDown } from 'lucide-react';
import { formatDMY, formatDMYTime, istToday } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Tab = 'hisaab' | 'handover' | 'adjustment' | 'naam';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hisaab', label: 'Hisaab', icon: ClipboardCheck },
    { id: 'handover', label: 'Handover', icon: ArrowRightLeft },
    { id: 'adjustment', label: 'Adjust', icon: Scale },
    { id: 'naam', label: 'Naya naam', icon: UserPlus },
];

export function CashClient({ position, saqlainiAvailable, bankHolder }: {
    position: CashPosition;
    saqlainiAvailable: number | null;
    bankHolder: string;
}) {
    const router = useRouter();
    const names = position.holders.filter(h => h.listed).map(h => h.name);

    const [tab, setTab] = useState<Tab>('hisaab');
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

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
            <SelectTrigger className={selectCls}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {names.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
        </Select>
    );

    /** One history row: what happened on the left, amount + delete on the right. */
    const historyRow = (key: string, main: React.ReactNode, sub: React.ReactNode, amount: React.ReactNode, onDelete: () => void, label: string) => (
        <li key={key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
                <div className="text-sm text-foreground">{main}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
            </div>
            <span className="shrink-0 text-sm font-bold">{amount}</span>
            <IconButton label={label} tone="danger" disabled={busy} onClick={onDelete} className="-mr-2">
                <Trash2 className="h-4 w-4" />
            </IconButton>
        </li>
    );

    return (
        <div className="space-y-5">
            <ChandaHoldersCard position={position} saqlainiAvailable={saqlainiAvailable} bankHolder={bankHolder} showDetailsLink={false} />

            {/* Entries made after the openings without a holder */}
            {position.unassignedEntries.length > 0 && (
                <Notice tone="warning">
                    <p className="font-semibold">In entries mein &quot;Paisa kiske paas&quot; nahi chuna gaya</p>
                    <p className="mt-0.5 text-xs">Chanda / Expenses page par Edit karke holder chuniye.</p>
                    <ul className="mt-2 space-y-1 text-xs">
                        {position.unassignedEntries.map((e, i) => (
                            <li key={i}>{e.kind === 'chanda' ? 'Chanda' : 'Kharch'} · {formatDMY(e.date)} · {e.name} · {money(e.amount)}</li>
                        ))}
                    </ul>
                </Notice>
            )}

            {/* ---------- Per-person breakdown ---------- */}
            <Panel title="Har aadmi ka hisaab" description="Card kholkar poori detail dekhein." icon={Users} flush>
                <ul className="divide-y divide-border/60">
                    {position.holders.map(h => (
                        <li key={h.name}>
                            <details className="group">
                                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-foreground">{h.name}</div>
                                        {h.lastSettlement && (
                                            <div className="text-xs text-muted-foreground">Aakhri hisaab {formatDMY(h.lastSettlement.date)} · {money(h.lastSettlement.amount)}</div>
                                        )}
                                    </div>
                                    <span className={cn('text-base font-bold', h.balance < 0 ? 'text-red-600' : 'text-primary')}>{money(h.balance)}</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                                </summary>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-muted/30 px-4 pb-4 pt-3 text-xs sm:px-5">
                                    <div>
                                        <dt className="text-muted-foreground">Opening</dt>
                                        <dd className="flex items-center gap-1 text-sm font-medium">
                                            {money(h.opening)}
                                            {h.listed && (
                                                <IconButton label={`${h.name} ka opening badlein`} className="h-7 w-7"
                                                    onClick={() => setOpeningEdit({ name: h.name, value: String(h.opening) })}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </IconButton>
                                            )}
                                        </dd>
                                    </div>
                                    <div><dt className="text-muted-foreground">Chanda mila</dt><dd className="text-sm font-medium">{money(h.received)}</dd></div>
                                    <div><dt className="text-muted-foreground">Kharch</dt><dd className="text-sm font-medium">{money(h.spent)}</dd></div>
                                    <div><dt className="text-muted-foreground">Handover +</dt><dd className="text-sm font-medium">{money(h.transferredIn)}</dd></div>
                                    <div><dt className="text-muted-foreground">Handover −</dt><dd className="text-sm font-medium">{money(h.transferredOut)}</dd></div>
                                    <div><dt className="text-muted-foreground">Adjustment</dt><dd className="text-sm font-medium">{h.adjusted > 0 ? '+' : ''}{money(h.adjusted)}</dd></div>
                                </dl>
                            </details>
                        </li>
                    ))}
                </ul>
                {position.openingAsOf && (
                    <p className="border-t border-border/60 px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
                        Opening balance {formatDMYTime(position.openingAsOf)} ke hisaab se. Usse pehle ki entries opening mein shamil hain.
                    </p>
                )}
            </Panel>

            {message && <Notice tone={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>{message.text}</Notice>}

            {/* ---------- Actions ---------- */}
            <div role="tablist" aria-label="Cash action" className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium leading-none transition-colors sm:flex-row sm:gap-2 sm:text-sm',
                                active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Hisaab milaan: the day someone's money was checked, and what it came to */}
            {tab === 'hisaab' && (
                <>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            run(() => addCashSettlement(settlement), 'Hisaab darj ho gaya.', () => setSettlement(emptySettlement));
                        }}
                    >
                        <Panel
                            title="Hisaab milaan"
                            description={'Jis din kisi ka hisaab hua, wo tareekh aur rakam darj karein. Har aadmi ke naam ke saath "Aakhri hisaab" dikhega.'}
                            icon={ClipboardCheck}
                            bodyClassName="space-y-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Kiska hisaab" required>
                                    {holderSelect(settlement.holder, v => setSettlement({ ...settlement, holder: v }), 'Chuniye...')}
                                </Field>
                                <Field label="Date" required>
                                    <Input type="date" value={settlement.date} onChange={(e) => setSettlement({ ...settlement, date: e.target.value })} required className={inputCls} />
                                </Field>
                            </div>
                            <Field
                                label="Hisaab mein kitna nikla (₹)"
                                required
                                hint={settlementHolder && (
                                    <>
                                        App ke hisaab se abhi: <strong>{money(settlementHolder.balance)}</strong>
                                        {settlement.amount !== '' && Math.round(settlementDiff) !== 0 && (
                                            <span className="text-amber-800"> - farq {settlementDiff > 0 ? '+' : ''}{money(settlementDiff)} adjustment mein darj ho jayega, taaki balance {money(Number(settlement.amount))} ho jaye.</span>
                                        )}
                                        {settlement.amount !== '' && Math.round(settlementDiff) === 0 && <span className="text-emerald-700"> - bilkul mil raha hai.</span>}
                                    </>
                                )}
                            >
                                <Input type="number" inputMode="numeric" min={0} value={settlement.amount} onChange={(e) => setSettlement({ ...settlement, amount: e.target.value })} required className={inputCls} />
                            </Field>
                            <Field label="Note">
                                <Input value={settlement.note} onChange={(e) => setSettlement({ ...settlement, note: e.target.value })} placeholder="Jaise: ledger se milaya" className={inputCls} />
                            </Field>
                            <SubmitButton loading={busy}>Hisaab darj karein</SubmitButton>
                        </Panel>
                    </form>

                    {position.settlements.length > 0 && (
                        <Panel title="Hisaab history" icon={History} flush>
                            <ul className="divide-y divide-border/60">
                                {position.settlements.map((s: CashSettlement) => historyRow(
                                    `${s.rowIndex}-${s.timestamp}`,
                                    <><strong>{s.holder}</strong> · {formatDMY(s.date)}</>,
                                    <>
                                        {Math.round(s.amount - s.appBalance) === 0
                                            ? 'App se bilkul mila'
                                            : `App mein ${money(s.appBalance)} tha, farq ${s.amount - s.appBalance > 0 ? '+' : ''}${money(s.amount - s.appBalance)}`}
                                        {s.note ? ` · ${s.note}` : ''}
                                    </>,
                                    <span className="text-primary">{money(s.amount)}</span>,
                                    async () => {
                                        const ok = await confirm({
                                            title: 'Hisaab record delete karein?',
                                            message: <>{s.holder} · {formatDMY(s.date)} · {money(s.amount)}. Iska adjustment (agar bana tha) alag se delete karna hoga.</>,
                                            danger: true,
                                        });
                                        if (!ok) return;
                                        run(() => deleteCashSettlement(s.rowIndex, { timestamp: s.timestamp, holder: s.holder, amount: s.amount }), 'Hisaab record deleted.');
                                    },
                                    `Delete hisaab ${s.holder}`
                                ))}
                            </ul>
                        </Panel>
                    )}
                </>
            )}

            {/* Handover */}
            {tab === 'handover' && (
                <>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            run(
                                () => addCashTransfer(transfer),
                                'Handover saved.',
                                () => setTransfer({ date: istToday(), from: '', to: '', amount: '', remarks: '' })
                            );
                        }}
                    >
                        <Panel
                            title="Paisa diya / Bank mein jama kiya"
                            description="Chanda ka paisa ek ke paas se doosre ke paas gaya - jaise Zahid ne Mushahid ko diya, ya bank mein jama kiya."
                            icon={ArrowRightLeft}
                            bodyClassName="space-y-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Kisne diya" required>
                                    {holderSelect(transfer.from, v => setTransfer({ ...transfer, from: v }), 'Chuniye...')}
                                </Field>
                                <Field label="Kisko mila" required>
                                    {holderSelect(transfer.to, v => setTransfer({ ...transfer, to: v }), 'Chuniye...')}
                                </Field>
                                <Field label="Amount (₹)" required>
                                    <Input type="number" inputMode="numeric" min={1} value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} required className={inputCls} />
                                </Field>
                                <Field label="Date" required>
                                    <Input type="date" value={transfer.date} onChange={(e) => setTransfer({ ...transfer, date: e.target.value })} required className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Remarks">
                                <Input value={transfer.remarks} onChange={(e) => setTransfer({ ...transfer, remarks: e.target.value })} className={inputCls} />
                            </Field>
                            <SubmitButton loading={busy}>Handover save karein</SubmitButton>
                        </Panel>
                    </form>

                    <Panel title="Handover history" icon={History} flush>
                        {position.transfers.length === 0 ? (
                            <EmptyState icon={ArrowRightLeft} title="Abhi koi handover nahi" />
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {position.transfers.slice(0, 50).map((t: CashTransfer) => historyRow(
                                    `${t.rowIndex}-${t.timestamp}`,
                                    <><strong>{t.from}</strong> → <strong>{t.to}</strong></>,
                                    <>{formatDMY(t.date)}{t.remarks ? ` · ${t.remarks}` : ''}</>,
                                    <span className="text-primary">{money(t.amount)}</span>,
                                    async () => {
                                        const ok = await confirm({
                                            title: 'Handover delete karein?',
                                            message: <>{t.from} → {t.to} · {money(t.amount)}</>,
                                            danger: true,
                                        });
                                        if (!ok) return;
                                        run(() => deleteCashTransfer(t.rowIndex, { timestamp: t.timestamp, from: t.from, to: t.to, amount: t.amount }), 'Handover deleted.');
                                    },
                                    `Delete handover ${t.from} to ${t.to}`
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}

            {/* Adjustment: correct what one person holds - never touches the public totals */}
            {tab === 'adjustment' && (
                <>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            run(() => addCashAdjustment(adjustment), 'Adjustment saved.', () => setAdjustment(emptyAdjustment));
                        }}
                    >
                        <Panel
                            title="Adjustment - paise daale / nikaale"
                            description="Kisi ke paas asal mein jitna paisa hai, use yahan theek karein. Iska asar sirf us aadmi ke hisaab par hota hai - public page ke Chanda / SaqlainiApp total waise hi asli entries se bante rahenge."
                            icon={Scale}
                            bodyClassName="space-y-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Kiske paas" required>
                                    {holderSelect(adjustment.holder, v => setAdjustment({ ...adjustment, holder: v }), 'Chuniye...')}
                                </Field>
                                <Field label="Kya hua" required>
                                    <Select value={adjustment.direction} onValueChange={(v) => setAdjustment({ ...adjustment, direction: v as 'in' | 'out' })}>
                                        <SelectTrigger className={selectCls}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="in">Paise daale (+)</SelectItem>
                                            <SelectItem value="out">Paise nikaale (−)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Amount (₹)" required>
                                    <Input type="number" inputMode="numeric" min={1} value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} required className={inputCls} />
                                </Field>
                                <Field label="Date" required>
                                    <Input type="date" value={adjustment.date} onChange={(e) => setAdjustment({ ...adjustment, date: e.target.value })} required className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Karan" required hint="Zaroori hai - baad mein yaad rakhne ke liye.">
                                <Input value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} required placeholder="Jaise: passbook se milaya, cash ginti mein kam nikla..." className={inputCls} />
                            </Field>
                            <SubmitButton loading={busy}>Adjustment save karein</SubmitButton>
                        </Panel>
                    </form>

                    <Panel title="Adjustment history" icon={History} flush>
                        {position.adjustments.length === 0 ? (
                            <EmptyState icon={Scale} title="Abhi koi adjustment nahi" />
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {position.adjustments.map((a: CashAdjustment) => historyRow(
                                    `${a.rowIndex}-${a.timestamp}`,
                                    <strong>{a.holder}</strong>,
                                    <>{formatDMY(a.date)} · {a.reason}</>,
                                    <span className={a.amount < 0 ? 'text-red-600' : 'text-primary'}>{a.amount > 0 ? '+' : ''}{money(a.amount)}</span>,
                                    async () => {
                                        const ok = await confirm({
                                            title: 'Adjustment delete karein?',
                                            message: <>{a.holder} · {a.amount > 0 ? '+' : ''}{money(a.amount)}</>,
                                            danger: true,
                                        });
                                        if (!ok) return;
                                        run(() => deleteCashAdjustment(a.rowIndex, { timestamp: a.timestamp, holder: a.holder, amount: a.amount }), 'Adjustment deleted.');
                                    },
                                    `Delete adjustment ${a.holder}`
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}

            {/* New name */}
            {tab === 'naam' && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        run(() => addCashHolder(newName), 'Name added.', () => setNewName(''));
                    }}
                >
                    <Panel
                        title="Naya naam jodein"
                        description={'Naya aadmi ₹0 se shuru hota hai. Use paisa dena ho to "Handover" se darj karein.'}
                        icon={UserPlus}
                        bodyClassName="space-y-4"
                    >
                        <Field label="Naam" required>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Naam" required className={inputCls} />
                        </Field>
                        <SubmitButton loading={busy}>Naam add karein</SubmitButton>
                    </Panel>
                </form>
            )}

            <Modal
                open={!!openingEdit}
                onClose={() => setOpeningEdit(null)}
                busy={busy}
                size="sm"
                title={`Opening balance - ${openingEdit?.name ?? ''}`}
                description="Sirf galti sudhaarne ke liye. Paisa ek se doosre ke paas gaya ho to handover darj karein."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setOpeningEdit(null)} disabled={busy}>Cancel</Button>
                        <Button disabled={busy} onClick={() => {
                            if (!openingEdit) return;
                            const edit = openingEdit;
                            run(() => updateCashHolderOpening(edit.name, Number(edit.value)), 'Opening updated.', () => setOpeningEdit(null));
                        }}>
                            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
                        </Button>
                    </>
                }
            >
                <Field label="Opening rakam (₹)">
                    <Input type="number" inputMode="numeric" value={openingEdit?.value ?? ''} onChange={(e) => setOpeningEdit(o => o && { ...o, value: e.target.value })} className={inputCls} />
                </Field>
            </Modal>

            {confirmDialog}
        </div>
    );
}
