'use server'

import { getSheetData, updateSheetRow, deleteSheetRow, verifySheetRow, readNormalizedRows, DateColumns } from '@/lib/sheets';
import { isIsoDate } from '@/lib/dates';
import { memberIdsPreserved, isFirstOfSeveral } from '@/lib/sheet-ids';
import { syncPaymentsFromSheet } from '@/lib/sync-logic';
import { requireAdmin } from '@/lib/auth';
import { PaymentEntriesResult, SimpleActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

const SHEET = 'FormResponses';
const FORM_RESPONSES_SHEET_ID = 212977166;

interface PaymentEntryInput {
    timestamp?: string;
    name?: string;
    paymentDate?: string;
    amount?: string | number;
    month?: string | number;
    monthName?: string;
    year?: string | number;
    phone?: string;
    remarks?: string;
}

/** Identifies the row the admin was actually looking at when the list was loaded. */
interface RowGuard {
    timestamp?: string;
    name?: string;
    amount?: string;
    month?: string;
    year?: string;
}

/** FormResponses date columns: A Timestamp, C Payment Date, F Month_F. */
const DATES: DateColumns = { 0: 'datetime', 2: 'date', 5: 'date' };

/**
 * See verifySheetRow. Timestamp + name alone could not tell apart the rows of
 * one multi-month payment (they share both), so amount/month/year are checked too.
 */
function assertRowUnchanged(rowIndex: number, expected: RowGuard): Promise<string | null> {
    return verifySheetRow(SHEET, 'I', rowIndex, {
        0: expected.timestamp,
        1: expected.name,
        3: expected.amount,
        4: expected.month,
        6: expected.year
    }, DATES);
}

const MEMBER_ID_SHIFT_ERROR =
    "This change would renumber other members: member ids in the Google Sheet follow the order in which names first appear, " +
    "and this entry decides where a member falls in that order. Photos would then show on the wrong people. " +
    "Change the amount, month or remarks instead, or make this change in the sheet itself and re-check the photos.";

const FIRST_ROW_ERROR =
    "This is this member's first entry. The DB sheet reads their phone number and Regular/One Time setting from it, " +
    "so deleting it or changing its name would lose both. Change the amount, month or remarks instead.";

/** FormResponses!B2:B - index 0 is the first data row (rowIndex 1). */
async function readNameColumn(): Promise<unknown[]> {
    return (await getSheetData(`${SHEET}!B2:B`)).map(r => r?.[0]);
}

/** Sync members + payments after changing the sheet; a warning if that failed. */
async function refreshFromSheet(done: string): Promise<string | undefined> {
    const problem = await syncPaymentsFromSheet();
    revalidatePath('/', 'layout');
    return problem
        ? `${done}, but the app could not refresh (${problem}). Run Sync from the admin panel.`
        : undefined;
}

export async function getPaymentEntries(page: number = 1, perPage: number = 10): Promise<PaymentEntriesResult> {
    const auth = await requireAdmin();
    if ('error' in auth) {
        return { entries: [], total: 0, page, perPage, error: auth.error };
    }

    try {
        // Raw values with dates as ISO - the display text would depend on the
        // sheet's date format, and writing it back on Edit swapped day and month.
        const data = await readNormalizedRows(`${SHEET}!A:I`, DATES);

        if (!data || data.length <= 1) {
            return { entries: [], total: 0, page, perPage };
        }

        // Remove header and reverse (latest first)
        const entries = data.slice(1).reverse().map((row, idx) => ({
            rowIndex: data.length - idx - 1, // Actual row index in sheet
            timestamp: row[0] || '',
            name: row[1] || '',
            paymentDate: row[2] || '',
            amount: row[3] || '',
            month: row[4] || '',
            monthName: row[5] || '',
            year: row[6] || '',
            phone: row[7] || '',  // Index 7 is Phone
            remarks: row[8] || '' // Index 8 is Remarks
        }));

        const total = entries.length;
        const safePage = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / perPage))));
        const start = (safePage - 1) * perPage;
        const paginatedEntries = entries.slice(start, start + perPage);

        return { entries: paginatedEntries, total, page: safePage, perPage };
    } catch (error: any) {
        console.error('Error fetching payment entries:', error);
        return { entries: [], total: 0, page, perPage, error: error?.message || 'Failed to load entries.' };
    }
}

export async function updatePaymentEntry(rowIndex: number, data: PaymentEntryInput, expected: RowGuard): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    try {
        const guardError = await assertRowUnchanged(rowIndex, expected);
        if (guardError) return { error: guardError };

        const typedName = String(data.name ?? '').trim();
        if (!typedName) return { error: 'Name is required.' };

        // The name is the member's key in the sheet (see sheet-ids.ts).
        // Unchanged apart from surrounding spaces -> keep the cell exactly as
        // it was, so the member is not mistaken for a new one.
        const names = await readNameColumn();
        const currentName = String(names[rowIndex - 1] ?? '');
        const name = currentName.trim() === typedName ? currentName : typedName;

        if (name !== currentName) {
            if (isFirstOfSeveral(names, rowIndex - 1)) {
                return { error: FIRST_ROW_ERROR };
            }
            const after = [...names];
            after[rowIndex - 1] = name;
            if (!memberIdsPreserved(names, after)) {
                return { error: MEMBER_ID_SHIFT_ERROR };
            }
        }

        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return { error: 'Amount must be a number greater than 0.' };
        }

        const month = Number(data.month);
        const year = Number(data.year);
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return { error: 'Month must be a number between 1 and 12.' };
        }
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return { error: 'Year must be a valid 4-digit year.' };
        }

        // ISO from the date picker; written as ISO so no locale can misread it.
        const paymentDate = String(data.paymentDate ?? '').trim();
        if (!isIsoDate(paymentDate)) {
            return { error: 'Please pick a valid payment date.' };
        }

        // Column F mirrors month + year (first day of that month). It was
        // written straight back from the loaded entry, so editing Month or Year
        // left the two columns describing different months.
        const monthName = `${year}-${String(month).padStart(2, '0')}-01`;

        // From column B: the timestamp is never edited, so it is not rewritten.
        // (Writing it back as display text is how dates got swapped before.)
        const range = `${SHEET}!B${rowIndex + 1}:I${rowIndex + 1}`;
        const values = [[
            name,
            paymentDate,
            amount,
            month,
            monthName,
            year,
            data.phone ?? '',   // Index 7
            data.remarks ?? ''  // Index 8
        ]];

        await updateSheetRow(range, values);

        // The app reads from the database, not the sheet - bring it up to date
        // now instead of showing the old amount/month until the next sync.
        const warning = await refreshFromSheet('Updated in the Google Sheet');
        revalidatePath('/admin');
        return { success: true, warning };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { error: error?.message || 'Failed to update entry.' };
    }
}

export async function deletePaymentEntry(rowIndex: number, expected: RowGuard): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    try {
        const guardError = await assertRowUnchanged(rowIndex, expected);
        if (guardError) return { error: guardError };

        // Deleting a member's first (or only) payment row moves or removes
        // them in the sheet's member list, renumbering everyone after them.
        const names = await readNameColumn();
        if (isFirstOfSeveral(names, rowIndex - 1)) {
            return { error: FIRST_ROW_ERROR };
        }
        const after = [...names];
        after.splice(rowIndex - 1, 1);
        if (!memberIdsPreserved(names, after)) {
            return { error: MEMBER_ID_SHIFT_ERROR };
        }

        await deleteSheetRow(rowIndex, FORM_RESPONSES_SHEET_ID);

        // Every payment after this row now has a new payment_id in the sheet;
        // re-align the database right away rather than at the next sync.
        const warning = await refreshFromSheet('Deleted from the Google Sheet');
        revalidatePath('/admin');
        return { success: true, warning };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { error: error?.message || 'Failed to delete entry.' };
    }
}
