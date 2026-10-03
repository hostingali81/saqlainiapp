'use server';

import { appendToSheet, updateSheetRow, deleteSheetRow, verifySheetRow, sheetTimestamp, toSheetDate, readNormalizedRows, DateColumns } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const SHEET = 'FormChanda';
const FORM_CHANDA_SHEET_ID = 639752441;

/** Date columns: A Timestamp, D Payment Date. */
const DATES: DateColumns = { 0: 'datetime', 3: 'date' };

/** The row as the admin saw it in the list - re-checked before edit/delete. */
interface ChandaRowGuard {
    timestamp?: string;
    name?: string;
    nameHindi?: string;
    paymentDate?: string;
    amount?: string;
}

function assertRowUnchanged(rowIndex: number, expected: ChandaRowGuard) {
    return verifySheetRow(SHEET, 'F', rowIndex, {
        0: expected.timestamp,
        1: expected.name,
        2: expected.nameHindi,
        3: expected.paymentDate,
        4: expected.amount
    }, DATES);
}

export async function submitFormChanda(formData: FormData) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        const name = String(formData.get('name') ?? '').trim();
        const nameHindi = String(formData.get('nameHindi') ?? '').trim();
        const paymentDate = formData.get('paymentDate') as string;
        const amount = Number(formData.get('amount'));
        const remarks = String(formData.get('remarks') ?? '').trim();

        if (!name) return { success: false, error: 'Name is required.' };
        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'Amount must be a number greater than 0.' };
        }

        // Built by hand so the date never shifts with the server's timezone.
        const formattedDate = toSheetDate(paymentDate);
        if (!formattedDate) return { success: false, error: 'Please enter a valid date.' };

        const values = [[
            // IST - the server clock is UTC, which put entries made between
            // midnight and 5:30 AM on the previous day.
            sheetTimestamp(),
            name,
            nameHindi,
            formattedDate,
            amount,
            remarks
        ]];

        await appendToSheet(`${SHEET}!A:F`, values);
        revalidatePath('/admin/form-chanda');

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting form chanda:', error);
        return { success: false, error: error.message };
    }
}

export async function getFormChandaEntries(page: number = 1, perPage: number = 10) {
    const auth = await requireAdmin();
    if ('error' in auth) return { entries: [], total: 0, page, perPage, error: auth.error };

    try {
        // Raw values with dates as ISO - see payments.ts.
        const data = await readNormalizedRows(`${SHEET}!A:F`, DATES);

        if (!data || data.length <= 1) {
            return { entries: [], total: 0, page, perPage };
        }

        const entries = data.slice(1).reverse().map((row, idx) => ({
            rowIndex: data.length - idx - 1,
            timestamp: row[0] || '',
            name: row[1] || '',
            nameHindi: row[2] || '',
            paymentDate: row[3] || '',
            amount: row[4] || '',
            remarks: row[5] || ''
        }));

        const total = entries.length;
        const start = (page - 1) * perPage;
        const paginatedEntries = entries.slice(start, start + perPage);

        return { entries: paginatedEntries, total, page, perPage };
    } catch (error) {
        console.error('Error fetching form chanda entries:', error);
        return { entries: [], total: 0, page, perPage };
    }
}

export async function updateFormChandaEntry(rowIndex: number, data: any, expected: ChandaRowGuard) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        // The list may be stale - make sure this is still the row the admin opened.
        const guardError = await assertRowUnchanged(rowIndex, expected);
        if (guardError) return { success: false, error: guardError };

        const name = String(data?.name ?? '').trim();
        if (!name) return { success: false, error: 'Name is required.' };
        const amount = Number(data?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'Amount must be a number greater than 0.' };
        }

        // ISO from the date picker. The dialog used to be handed the sheet's
        // display text, which a date input cannot show, so it was written back
        // untouched - and the sheet then read "10/09/2026" month-first.
        const paymentDate = toSheetDate(data?.paymentDate);
        if (!paymentDate) return { success: false, error: 'Please pick a valid date.' };

        // From column B: the timestamp is never edited, so it is not rewritten.
        const range = `${SHEET}!B${rowIndex + 1}:F${rowIndex + 1}`;
        const values = [[
            name,
            data.nameHindi ?? '',
            paymentDate,
            amount,
            data.remarks ?? ''
        ]];

        await updateSheetRow(range, values);
        revalidatePath('/admin/form-chanda');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteFormChandaEntry(rowIndex: number, expected: ChandaRowGuard) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        // A stale rowIndex used to delete whichever row had moved into its place.
        const guardError = await assertRowUnchanged(rowIndex, expected);
        if (guardError) return { success: false, error: guardError };

        await deleteSheetRow(rowIndex, FORM_CHANDA_SHEET_ID);
        revalidatePath('/admin/form-chanda');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { success: false, error: error.message };
    }
}
