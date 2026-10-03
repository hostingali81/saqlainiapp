import Link from 'next/link';
import type { CashPosition } from '@/lib/cash';
import { formatIndianCurrency } from '@/lib/utils';
import { formatDMY } from '@/lib/dates';

/** ₹ amount that also reads right when it is negative (somebody gave out more than they held). */
export function money(amount: number): string {
    const rounded = Math.round(amount);
    return `${rounded < 0 ? '−' : ''}₹${formatIndianCurrency(Math.abs(rounded))}`;
}

/**
 * ADMIN ONLY - where the Chanda money physically is. Render it only after an
 * admin check; the public totals are shown elsewhere and never change.
 */
export function ChandaHoldersCard({ position, saqlainiAvailable, bankHolder, showDetailsLink = true }: {
    position: CashPosition;
    /** SaqlainiApp fund balance, to show what the bank account should hold in total. */
    saqlainiAvailable: number | null;
    bankHolder: string;
    showDetailsLink?: boolean;
}) {
    const held = position.holders.reduce((sum, h) => sum + h.balance, 0);
    const bank = position.holders.find(h => h.name === bankHolder);

    return (
        <div className="rounded-[15px] p-6 mb-6" style={{ background: '#FFF8E7', border: '2px dashed #C6A869' }}>
            <h3 className="text-xl font-bold mb-1 pb-2" style={{ color: '#4A3728', borderBottom: '2px solid #E5D3AA' }}>
                चंदे का पैसा किसके पास है
            </h3>
            <p className="text-[11px] mb-3" style={{ color: '#8B7355' }}>Sirf admin ko dikhta hai</p>

            <div className="space-y-2">
                {position.holders.map(h => (
                    <div key={h.name} className="flex justify-between items-center p-3 rounded-[10px]" style={{ background: 'rgba(229, 211, 170, 0.4)' }}>
                        <span className="font-medium" style={{ color: '#4A3728' }}>
                            {h.name}
                            {!h.listed && <span className="ml-2 text-[10px] text-red-600">(list mein nahi)</span>}
                            {h.lastSettlement && (
                                <span className="block text-[11px] font-normal" style={{ color: '#8B7355' }}>
                                    Aakhri hisaab: {formatDMY(h.lastSettlement.date)} ko {money(h.lastSettlement.amount)}
                                </span>
                            )}
                        </span>
                        <span className={`font-bold text-lg ${h.balance < 0 ? 'text-red-600' : ''}`} style={h.balance < 0 ? undefined : { color: '#0D483B' }}>
                            {money(h.balance)}
                        </span>
                    </div>
                ))}

                <div className="flex justify-between items-center px-3 pt-2 text-sm font-bold" style={{ color: '#4A3728' }}>
                    <span>Logon ke paas kul</span>
                    <span>{money(held)}</span>
                </div>
            </div>

            {/* How the money held lines up with the real entries (the public figure). */}
            <div className="mt-3 p-3 rounded-[10px] text-xs space-y-1" style={{ background: 'rgba(229, 211, 170, 0.25)', color: '#4A3728' }}>
                <div className="flex justify-between">
                    <span>Entries ke hisaab se Chanda Available (public)</span>
                    <span className="font-bold">{money(position.chandaAvailable)}</span>
                </div>
                {Math.round(position.adjustmentsNet) !== 0 && (
                    <div className="flex justify-between">
                        <span>Admin adjustment (sirf yahan, public par asar nahi)</span>
                        <span className="font-bold">{position.adjustmentsNet > 0 ? '+' : ''}{money(position.adjustmentsNet)}</span>
                    </div>
                )}
            </div>

            {Math.round(position.unaccounted) !== 0 && (
                <div className="mt-3 p-3 rounded-[10px] text-sm bg-amber-100 text-amber-900">
                    {position.unaccounted < 0 ? (
                        <>⚠ Logon ke paas entries se <strong>{money(-position.unaccounted)} zyada</strong> hai, jiska hisaab nahi mila.</>
                    ) : (
                        <>⚠ <strong>{money(position.unaccounted)}</strong> ka hisaab kisi ke naam nahi.</>
                    )}
                    {position.unassignedEntries.length > 0 && ` ${position.unassignedEntries.length} entry mein "Paisa kiske paas" nahi chuna gaya.`}
                    {' '}Ye kisi ki opening rakam (Cash page par ✏) ya kisi entry ki galti se hota hai - wahi theek karein.
                </div>
            )}

            {bank && saqlainiAvailable !== null && (
                <div className="mt-3 p-3 rounded-[10px] text-sm" style={{ background: '#E5D3AA', color: '#0D483B' }}>
                    <div className="font-bold">Bank account mein kul: {money(saqlainiAvailable + bank.balance)}</div>
                    <div className="text-xs mt-1" style={{ color: '#4A3728' }}>
                        SaqlainiApp {money(saqlainiAvailable)} + Chanda {money(bank.balance)}
                    </div>
                </div>
            )}

            {showDetailsLink && (
                <div className="mt-4 text-right">
                    <Link href="/admin/cash" className="text-sm font-bold underline" style={{ color: '#0D483B' }}>
                        Poora hisaab / handover →
                    </Link>
                </div>
            )}
        </div>
    );
}
