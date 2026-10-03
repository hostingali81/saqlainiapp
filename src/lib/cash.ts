import { readNormalizedRanges, getSheetData } from '@/lib/sheets';

/**
 * Where the Chanda money physically is - an ADMIN-ONLY view.
 *
 * The public "Chanda Available" figure is a fund total and stays exactly as it
 * is. On top of it, every rupee of that fund is somewhere: as cash with a
 * person, or in the SaqlainiApp bank account (donors sometimes transfer
 * straight into it). That location is kept only in the Google Sheet - never in
 * the Supabase tables the public pages read, since anyone can query those
 * through the API whatever the UI hides:
 *
 *   CashHolders      Name | Opening | Opening As Of    one row per holder
 *   CashTransfers    Timestamp | Date | From | To | Amount | Remarks
 *   CashAdjustments  Timestamp | Date | Holder | Amount (+ in / - out) | Reason
 *   CashSettlements  Timestamp | Date | Holder | Amount | App Balance | Note
 *                    "hisaab milaan" - the day someone's money was checked and
 *                    what it came to (with what the app showed at that moment)
 *   FormChanda       column G "Holder" - who received the donation
 *   FormExpenses     column H "Holder" - whose money paid a Chanda-head expense
 *
 *   balance = opening + received - spent + handed to them - handed over by them
 *             + adjustments
 *
 * Adjustments are the admin's corrections to what somebody actually holds
 * (cash found short or extra, a figure taken from their own book). They change
 * that person's balance only - never the public Chanda / SaqlainiApp totals,
 * which come from the real entries alone - and are shown as the explained part
 * of any gap between the two.
 *
 * Entries from before the opening balances have no holder - the openings
 * already include them.
 */

export const HOLDERS_SHEET = 'CashHolders';
export const TRANSFERS_SHEET = 'CashTransfers';
export const ADJUSTMENTS_SHEET = 'CashAdjustments';
export const SETTLEMENTS_SHEET = 'CashSettlements';
/** Chanda money sitting in the SaqlainiApp bank account. */
export const BANK_HOLDER = 'SaqlainiApp (Bank)';

// Column positions (0-based) in the sheets above.
const CHANDA = { timestamp: 0, name: 1, date: 3, amount: 4, holder: 6 };
const EXPENSE = { timestamp: 0, name: 1, date: 3, amount: 4, head: 6, holder: 7 };
const HOLDER = { name: 0, opening: 1, openingAsOf: 2 };
const TRANSFER = { timestamp: 0, date: 1, from: 2, to: 3, amount: 4, remarks: 5 };
const ADJUSTMENT = { timestamp: 0, date: 1, holder: 2, amount: 3, reason: 4 };
const SETTLEMENT = { timestamp: 0, date: 1, holder: 2, amount: 3, appBalance: 4, note: 5 };

/** One spelling per name: single spaces, no padding. */
export function cleanHolderName(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const amountOf = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export interface HolderBalance {
    name: string;
    opening: number;
    received: number;
    spent: number;
    transferredIn: number;
    transferredOut: number;
    /** Net admin adjustments (+ money put in, - taken out). */
    adjusted: number;
    balance: number;
    /** The latest "hisaab milaan" for this person, if any. */
    lastSettlement: CashSettlement | null;
    /** False for a name used in an entry but missing from CashHolders (a typo, or a removed row). */
    listed: boolean;
}

export interface CashTransfer {
    /** 0-based row in CashTransfers, header = 0. */
    rowIndex: number;
    timestamp: string;
    date: string;
    from: string;
    to: string;
    amount: number;
    remarks: string;
}

/** An admin correction to one holder's money. */
export interface CashAdjustment {
    /** 0-based row in CashAdjustments, header = 0. */
    rowIndex: number;
    timestamp: string;
    date: string;
    holder: string;
    /** Positive: money put in. Negative: money taken out. */
    amount: number;
    reason: string;
}

/** A "hisaab milaan": on `date`, `holder` had `amount`; the app showed `appBalance` then. */
export interface CashSettlement {
    /** 0-based row in CashSettlements, header = 0. */
    rowIndex: number;
    timestamp: string;
    date: string;
    holder: string;
    amount: number;
    appBalance: number;
    note: string;
}

/** A Chanda entry or Chanda-head expense made after the openings but with no holder. */
export interface UnassignedEntry {
    kind: 'chanda' | 'expense';
    timestamp: string;
    date: string;
    name: string;
    amount: number;
}

export interface CashPosition {
    /** Same figure as the public page: all Chanda received - all Chanda-head expenses. */
    chandaAvailable: number;
    holders: HolderBalance[];
    /** Net of all adjustments - the part of any gap the admin has explained. */
    adjustmentsNet: number;
    /**
     * The gap nobody has explained: chandaAvailable + adjustments - everything
     * held. 0 when every rupee is accounted for; negative when people hold more
     * than the entries say.
     */
    unaccounted: number;
    unassignedEntries: UnassignedEntry[];
    /** Newest first. */
    transfers: CashTransfer[];
    /** Newest first. */
    adjustments: CashAdjustment[];
    /** Newest first. */
    settlements: CashSettlement[];
    /** When the opening balances were taken (ISO), or null before setup. */
    openingAsOf: string | null;
}

/** Normalized sheet rows in, balances out. No I/O, so it can be tested on its own. */
export function computeCashPosition(input: {
    chandaRows: string[][];
    expenseRows: string[][];
    holderRows: string[][];
    transferRows: string[][];
    adjustmentRows?: string[][];
    settlementRows?: string[][];
}): CashPosition {
    const holders = new Map<string, HolderBalance>();
    const holderFor = (rawName: unknown, listed = false): HolderBalance => {
        const name = cleanHolderName(rawName);
        let h = holders.get(name);
        if (!h) {
            h = { name, opening: 0, received: 0, spent: 0, transferredIn: 0, transferredOut: 0, adjusted: 0, balance: 0, lastSettlement: null, listed };
            holders.set(name, h);
        }
        return h;
    };

    let openingAsOf: string | null = null;
    for (const row of input.holderRows) {
        if (!cleanHolderName(row[HOLDER.name])) continue;
        const h = holderFor(row[HOLDER.name], true);
        h.listed = true;
        h.opening += amountOf(row[HOLDER.opening]);
        const asOf = row[HOLDER.openingAsOf] || '';
        if (asOf && (!openingAsOf || asOf < openingAsOf)) openingAsOf = asOf;
    }

    // Entries after the openings must name a holder; earlier ones are in the openings.
    const isAfterOpening = (timestamp: string) => !!openingAsOf && !!timestamp && timestamp > openingAsOf;
    const unassignedEntries: UnassignedEntry[] = [];

    let chandaIn = 0;
    for (const row of input.chandaRows) {
        const amount = amountOf(row[CHANDA.amount]);
        if (!row.some(c => c !== '')) continue;
        chandaIn += amount;
        const holder = cleanHolderName(row[CHANDA.holder]);
        if (holder) {
            holderFor(holder).received += amount;
        } else if (isAfterOpening(row[CHANDA.timestamp])) {
            unassignedEntries.push({ kind: 'chanda', timestamp: row[CHANDA.timestamp], date: row[CHANDA.date], name: row[CHANDA.name], amount });
        }
    }

    let chandaOut = 0;
    for (const row of input.expenseRows) {
        if (String(row[EXPENSE.head] ?? '').trim() !== 'Chanda') continue;
        const amount = amountOf(row[EXPENSE.amount]);
        chandaOut += amount;
        const holder = cleanHolderName(row[EXPENSE.holder]);
        if (holder) {
            holderFor(holder).spent += amount;
        } else if (isAfterOpening(row[EXPENSE.timestamp])) {
            unassignedEntries.push({ kind: 'expense', timestamp: row[EXPENSE.timestamp], date: row[EXPENSE.date], name: row[EXPENSE.name], amount });
        }
    }

    const transfers: CashTransfer[] = [];
    input.transferRows.forEach((row, i) => {
        const from = cleanHolderName(row[TRANSFER.from]);
        const to = cleanHolderName(row[TRANSFER.to]);
        const amount = amountOf(row[TRANSFER.amount]);
        if (!from && !to && !amount) return;
        if (from) holderFor(from).transferredOut += amount;
        if (to) holderFor(to).transferredIn += amount;
        transfers.push({
            rowIndex: i + 1, // rows are read from row 2
            timestamp: row[TRANSFER.timestamp] || '',
            date: row[TRANSFER.date] || '',
            from,
            to,
            amount,
            remarks: row[TRANSFER.remarks] || '',
        });
    });

    const adjustments: CashAdjustment[] = [];
    let adjustmentsNet = 0;
    (input.adjustmentRows || []).forEach((row, i) => {
        const holder = cleanHolderName(row[ADJUSTMENT.holder]);
        const amount = amountOf(row[ADJUSTMENT.amount]);
        if (!holder || !amount) return;
        holderFor(holder).adjusted += amount;
        adjustmentsNet += amount;
        adjustments.push({
            rowIndex: i + 1, // rows are read from row 2
            timestamp: row[ADJUSTMENT.timestamp] || '',
            date: row[ADJUSTMENT.date] || '',
            holder,
            amount,
            reason: row[ADJUSTMENT.reason] || '',
        });
    });

    // A settlement is a dated record - it does not move money by itself. (Any
    // difference found at the time is saved as an adjustment, see
    // addCashSettlement.)
    const settlements: CashSettlement[] = [];
    (input.settlementRows || []).forEach((row, i) => {
        const holder = cleanHolderName(row[SETTLEMENT.holder]);
        if (!holder || row[SETTLEMENT.amount] === '') return;
        const s: CashSettlement = {
            rowIndex: i + 1, // rows are read from row 2
            timestamp: row[SETTLEMENT.timestamp] || '',
            date: row[SETTLEMENT.date] || '',
            holder,
            amount: amountOf(row[SETTLEMENT.amount]),
            appBalance: amountOf(row[SETTLEMENT.appBalance]),
            note: row[SETTLEMENT.note] || '',
        };
        settlements.push(s);
        const h = holderFor(holder);
        const prev = h.lastSettlement;
        if (!prev || `${s.date}${s.timestamp}` >= `${prev.date}${prev.timestamp}`) h.lastSettlement = s;
    });

    let held = 0;
    for (const h of holders.values()) {
        h.balance = h.opening + h.received - h.spent + h.transferredIn - h.transferredOut + h.adjusted;
        held += h.balance;
    }

    const chandaAvailable = chandaIn - chandaOut;
    return {
        chandaAvailable,
        holders: [...holders.values()],
        adjustmentsNet,
        // Adjustments are a known, recorded difference - only the rest is a gap.
        unaccounted: chandaAvailable + adjustmentsNet - held,
        unassignedEntries,
        transfers: transfers.reverse(),
        adjustments: adjustments.reverse(),
        settlements: settlements.reverse(),
        openingAsOf,
    };
}

/** Reads everything it needs in one request. Admin-only: callers must check first. */
export async function readCashPosition(): Promise<CashPosition> {
    const specs = [
        { range: 'FormChanda!A2:G', dates: { [CHANDA.timestamp]: 'datetime' as const, [CHANDA.date]: 'date' as const } },
        { range: 'FormExpenses!A2:H', dates: { [EXPENSE.timestamp]: 'datetime' as const, [EXPENSE.date]: 'date' as const } },
        { range: `${HOLDERS_SHEET}!A2:C`, dates: { [HOLDER.openingAsOf]: 'datetime' as const } },
        { range: `${TRANSFERS_SHEET}!A2:F`, dates: { [TRANSFER.timestamp]: 'datetime' as const, [TRANSFER.date]: 'date' as const } },
        { range: `${ADJUSTMENTS_SHEET}!A2:E`, dates: { [ADJUSTMENT.timestamp]: 'datetime' as const, [ADJUSTMENT.date]: 'date' as const } },
        { range: `${SETTLEMENTS_SHEET}!A2:F`, dates: { [SETTLEMENT.timestamp]: 'datetime' as const, [SETTLEMENT.date]: 'date' as const } },
    ];
    const [chandaRows, expenseRows, holderRows, transferRows, adjustmentRows, settlementRows] = await readNormalizedRanges(specs);
    return computeCashPosition({ chandaRows, expenseRows, holderRows, transferRows, adjustmentRows, settlementRows });
}

/** Holder names for the entry forms, plus when the openings were taken. */
export async function readHolders(): Promise<{ names: string[]; openingAsOf: string | null }> {
    const [rows] = await readNormalizedRanges([{ range: `${HOLDERS_SHEET}!A2:C`, dates: { [HOLDER.openingAsOf]: 'datetime' } }]);
    const names: string[] = [];
    let openingAsOf: string | null = null;
    for (const row of rows) {
        const name = cleanHolderName(row[HOLDER.name]);
        if (!name || names.includes(name)) continue;
        names.push(name);
        const asOf = row[HOLDER.openingAsOf] || '';
        if (asOf && (!openingAsOf || asOf < openingAsOf)) openingAsOf = asOf;
    }
    return { names, openingAsOf };
}

/** Sheet row (1-based) of a holder, or null. */
export async function findHolderRow(name: string): Promise<number | null> {
    const wanted = cleanHolderName(name);
    const rows = await getSheetData(`${HOLDERS_SHEET}!A2:A`);
    const index = rows.findIndex(r => cleanHolderName(r?.[0]) === wanted);
    return index === -1 ? null : index + 2;
}

/**
 * The holder a Chanda entry (or Chanda-head expense) should carry.
 *
 * `entryTimestamp` is the entry's own timestamp (ISO), or null for a new one.
 * Entries made after the openings must name someone from the list. Entries
 * from before must NOT: the opening balances already include them, so giving
 * them a holder would count the money twice.
 */
export async function resolveHolder(value: unknown, entryTimestamp: string | null): Promise<{ holder: string } | { error: string }> {
    const { names, openingAsOf } = await readHolders();
    if (!openingAsOf) return { holder: '' }; // holder tracking not set up

    const holder = cleanHolderName(value);
    const afterOpening = entryTimestamp === null || entryTimestamp > openingAsOf;

    if (!afterOpening) {
        return holder
            ? { error: 'This entry is from before the opening cash balances, which already include it - leave "Paisa kiske paas" empty.' }
            : { holder: '' };
    }
    if (!holder) {
        return { error: 'Please choose who has this money ("Paisa kiske paas").' };
    }
    if (!names.includes(holder)) {
        return { error: `"${holder}" is not in the holders list. Add the name on the Cash page first.` };
    }
    return { holder };
}
