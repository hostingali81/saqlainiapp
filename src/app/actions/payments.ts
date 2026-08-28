'use server'

import { getSheetData, updateSheetRow, deleteSheetRow } from '@/lib/sheets';
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
}

/**
 * `rowIndex` is computed when the list is fetched, so by the time Edit/Delete
 * runs the sheet may have shifted (another admin deleting a row, a manual edit,
 * a re-sort) and the index would point at somebody else's payment.
 * Re-read the row and confirm it is still the one the admin selected.
 */
async function assertRowUnchanged(rowIndex: number, expected: RowGuard): Promise<string | null> {
    // Row 0 is the header; data starts at index 1.
    if (!Number.isInteger(rowIndex) || rowIndex < 1) {
        return 'Invalid entry reference. Please refresh the list and try again.';
    }

    const sheetRow = rowIndex + 1;
    const rows = await getSheetData(`${SHEET}!A${sheetRow}:I${sheetRow}`);
    const row = rows?.[0];

    if (!row) {
        return 'This entry no longer exists. Please refresh the list and try again.';
    }

    const norm = (v: any) => String(v ?? '').trim();
    if (norm(row[0]) !== norm(expected.timestamp) || norm(row[1]) !== norm(expected.name)) {
        return 'This entry changed since the list was loaded. Please refresh the list and try again.';
    }

    return null;
}

export async function getPaymentEntries(page: number = 1, perPage: number = 10): Promise<PaymentEntriesResult> {
    const auth = await requireAdmin();
    if ('error' in auth) {
        return { entries: [], total: 0, page, perPage, error: auth.error };
    }

    try {
        const data = await getSheetData(`${SHEET}!A:I`);

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

        const name = String(data.name ?? '').trim();
        if (!name) return { error: 'Name is required.' };

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

        // Column F mirrors month + year as MM/01/YYYY. It was written straight
        // back from the loaded entry, so editing Month or Year left the two
        // columns describing different months.
        const monthName = `${String(month).padStart(2, '0')}/01/${year}`;

        const range = `${SHEET}!A${rowIndex + 1}:I${rowIndex + 1}`;
        const values = [[
            data.timestamp ?? '',
            name,
            data.paymentDate ?? '',
            amount,
            month,
            monthName,
            year,
            data.phone ?? '',   // Index 7
            data.remarks ?? ''  // Index 8
        ]];

        await updateSheetRow(range, values);
        revalidatePath('/admin');
        return { success: true };
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

        await deleteSheetRow(rowIndex, FORM_RESPONSES_SHEET_ID);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { error: error?.message || 'Failed to delete entry.' };
    }
}
