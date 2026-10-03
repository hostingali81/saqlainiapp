'use server';

import { requireAdmin } from '@/lib/auth';
import { appendToSheet, updateSheetRow, deleteSheetRow, verifySheetRow, sheetTimestamp, toSheetDate, getSheetIdByTitle } from '@/lib/sheets';
import { HOLDERS_SHEET, TRANSFERS_SHEET, ADJUSTMENTS_SHEET, SETTLEMENTS_SHEET, cleanHolderName, readHolders, findHolderRow, readCashPosition } from '@/lib/cash';
import { formatDMY } from '@/lib/dates';
import { SimpleActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

/** Everything that shows cash balances. */
function revalidateCashViews() {
    revalidatePath('/admin/cash');
    revalidatePath('/admin/form-chanda');
    revalidatePath('/admin/form-expenses');
    revalidatePath('/total_monthly_history');
}

/**
 * A new person who can hold Chanda money. They start at 0 - money reaches
 * them through a handover or a Chanda entry, so the totals keep adding up.
 */
export async function addCashHolder(rawName: string): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    const name = cleanHolderName(rawName);
    if (!name) return { error: 'Please enter a name.' };
    if (name.length > 60) return { error: 'The name is too long.' };

    try {
        const { names } = await readHolders();
        if (names.some(n => n.toLowerCase() === name.toLowerCase())) {
            return { error: `"${name}" is already in the list.` };
        }
        await appendToSheet(`${HOLDERS_SHEET}!A:C`, [[name, 0, sheetTimestamp()]]);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error adding cash holder:', error);
        return { error: error?.message || 'Could not add the name.' };
    }
}

/** Correct someone's opening balance (the amount they held when tracking began). */
export async function updateCashHolderOpening(rawName: string, opening: number): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    if (!Number.isFinite(opening)) return { error: 'Opening must be a number.' };

    try {
        const row = await findHolderRow(rawName);
        if (!row) return { error: 'That name is no longer in the list. Please refresh.' };
        await updateSheetRow(`${HOLDERS_SHEET}!B${row}`, [[opening]]);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error updating opening balance:', error);
        return { error: error?.message || 'Could not update the opening balance.' };
    }
}

/** Cash moving between holders - e.g. Zahid hands ₹5,000 to Mushahid, or deposits it in the bank. */
export async function addCashTransfer(data: {
    date: string;
    from: string;
    to: string;
    amount: number | string;
    remarks?: string;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    const date = toSheetDate(data?.date);
    if (!date) return { error: 'Please pick a valid date.' };

    const from = cleanHolderName(data?.from);
    const to = cleanHolderName(data?.to);
    if (!from || !to) return { error: 'Please choose who gave and who received the money.' };
    if (from === to) return { error: 'Giver and receiver must be different.' };

    const amount = Number(data?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be a number greater than 0.' };

    try {
        const { names } = await readHolders();
        for (const n of [from, to]) {
            if (!names.includes(n)) return { error: `"${n}" is not in the holders list.` };
        }
        await appendToSheet(`${TRANSFERS_SHEET}!A:F`, [[
            sheetTimestamp(), date, from, to, amount, String(data?.remarks ?? '').trim()
        ]]);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error adding cash transfer:', error);
        return { error: error?.message || 'Could not save the handover.' };
    }
}

/**
 * Put money into, or take it out of, one holder's balance - a correction to
 * what they actually hold. Only that holder's figure moves: the public
 * Chanda / SaqlainiApp totals come from the real entries and are untouched.
 */
export async function addCashAdjustment(data: {
    date: string;
    holder: string;
    direction: 'in' | 'out';
    amount: number | string;
    reason: string;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    const date = toSheetDate(data?.date);
    if (!date) return { error: 'Please pick a valid date.' };

    const holder = cleanHolderName(data?.holder);
    if (!holder) return { error: 'Please choose whose money this is.' };

    if (data?.direction !== 'in' && data?.direction !== 'out') {
        return { error: 'Choose whether money was put in or taken out.' };
    }

    const amount = Number(data?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be a number greater than 0.' };

    // Every correction must say why - it is the only record of it.
    const reason = String(data?.reason ?? '').trim();
    if (!reason) return { error: 'Please write the reason for this adjustment.' };

    try {
        const { names } = await readHolders();
        if (!names.includes(holder)) return { error: `"${holder}" is not in the holders list.` };

        await appendToSheet(`${ADJUSTMENTS_SHEET}!A:E`, [[
            sheetTimestamp(), date, holder, data.direction === 'in' ? amount : -amount, reason
        ]]);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error adding cash adjustment:', error);
        return { error: error?.message || 'Could not save the adjustment.' };
    }
}

/**
 * "Hisaab milaan": record that on `date` the admin checked `holder`'s money
 * and it came to `amount`. What the app showed at that moment is saved
 * alongside, so the record shows later whether it matched.
 *
 * If the counted amount differs, the difference is also saved as an
 * adjustment (with the note as its reason), so from then on the app shows the
 * counted amount. Public totals are untouched either way.
 */
export async function addCashSettlement(data: {
    date: string;
    holder: string;
    amount: number | string;
    note?: string;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    const date = toSheetDate(data?.date);
    if (!date) return { error: 'Please pick a valid date.' };

    const holder = cleanHolderName(data?.holder);
    if (!holder) return { error: 'Please choose whose money was checked.' };

    const amount = Number(data?.amount);
    if (!Number.isFinite(amount) || amount < 0) return { error: 'Amount must be 0 or more.' };

    const note = String(data?.note ?? '').trim();

    try {
        const position = await readCashPosition();
        const h = position.holders.find(x => x.name === holder && x.listed);
        if (!h) return { error: `"${holder}" is not in the holders list.` };

        const appBalance = h.balance;
        const stamp = sheetTimestamp();
        await appendToSheet(`${SETTLEMENTS_SHEET}!A:F`, [[stamp, date, holder, amount, appBalance, note]]);

        const difference = amount - appBalance;
        let warning: string | undefined;
        if (Math.round(difference) !== 0) {
            const reason = `Hisaab milaan ${formatDMY(date)}${note ? ': ' + note : ''}`;
            await appendToSheet(`${ADJUSTMENTS_SHEET}!A:E`, [[stamp, date, holder, difference, reason]]);
            warning = `App ke hisaab se ₹${appBalance} tha, ginti ₹${amount} - farq ₹${difference} adjustment mein darj ho gaya.`;
        }

        revalidateCashViews();
        return { success: true, warning };
    } catch (error: any) {
        console.error('Error adding cash settlement:', error);
        return { error: error?.message || 'Could not save the hisaab.' };
    }
}

/** Remove a hisaab record entered by mistake (an adjustment it created stays - delete that separately). */
export async function deleteCashSettlement(rowIndex: number, expected: {
    timestamp: string;
    holder: string;
    amount: number;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    try {
        const guardError = await verifySheetRow(SETTLEMENTS_SHEET, 'F', rowIndex, {
            0: expected?.timestamp,
            2: expected?.holder,
            3: expected?.amount,
        }, { 0: 'datetime', 1: 'date' });
        if (guardError) return { error: guardError };

        const sheetId = await getSheetIdByTitle(SETTLEMENTS_SHEET);
        if (sheetId === null) return { error: `The "${SETTLEMENTS_SHEET}" tab is missing.` };

        await deleteSheetRow(rowIndex, sheetId);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting cash settlement:', error);
        return { error: error?.message || 'Could not delete the hisaab.' };
    }
}

/** Remove an adjustment entered by mistake. Re-checks the row first. */
export async function deleteCashAdjustment(rowIndex: number, expected: {
    timestamp: string;
    holder: string;
    amount: number;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    try {
        const guardError = await verifySheetRow(ADJUSTMENTS_SHEET, 'E', rowIndex, {
            0: expected?.timestamp,
            2: expected?.holder,
            3: expected?.amount,
        }, { 0: 'datetime', 1: 'date' });
        if (guardError) return { error: guardError };

        const sheetId = await getSheetIdByTitle(ADJUSTMENTS_SHEET);
        if (sheetId === null) return { error: `The "${ADJUSTMENTS_SHEET}" tab is missing.` };

        await deleteSheetRow(rowIndex, sheetId);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting cash adjustment:', error);
        return { error: error?.message || 'Could not delete the adjustment.' };
    }
}

/** Remove a handover entered by mistake. Re-checks the row first, like every other delete. */
export async function deleteCashTransfer(rowIndex: number, expected: {
    timestamp: string;
    from: string;
    to: string;
    amount: number;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    try {
        const guardError = await verifySheetRow(TRANSFERS_SHEET, 'F', rowIndex, {
            0: expected?.timestamp,
            2: expected?.from,
            3: expected?.to,
            4: expected?.amount,
        }, { 0: 'datetime', 1: 'date' });
        if (guardError) return { error: guardError };

        const sheetId = await getSheetIdByTitle(TRANSFERS_SHEET);
        if (sheetId === null) return { error: `The "${TRANSFERS_SHEET}" tab is missing.` };

        await deleteSheetRow(rowIndex, sheetId);
        revalidateCashViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting cash transfer:', error);
        return { error: error?.message || 'Could not delete the handover.' };
    }
}
