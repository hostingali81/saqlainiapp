'use server';

import { appendToSheet, updateSheetRow, deleteSheetRow, verifySheetRow, sheetTimestamp, toSheetDate, readNormalizedRows, DateColumns } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';
import { resolveHolder } from '@/lib/cash';
import { revalidatePath } from 'next/cache';

const SHEET = 'FormExpenses';
const FORM_EXPENSES_SHEET_ID = 958087616;

/** Date columns: A Timestamp, D Payment Date. */
const DATES: DateColumns = { 0: 'datetime', 3: 'date' };

/** The row as the admin saw it in the list - re-checked before edit/delete. */
interface ExpenseRowGuard {
    timestamp?: string;
    name?: string;
    description?: string;
    paymentDate?: string;
    amount?: string;
}

const HEADS = ['SaqlainiApp', 'Chanda'];

/** Chanda-head expenses feed the admin cash balances too. */
function revalidateExpenseViews() {
    revalidatePath('/admin/form-expenses');
    revalidatePath('/admin/cash');
    revalidatePath('/total_monthly_history');
}

function assertRowUnchanged(rowIndex: number, expected: ExpenseRowGuard) {
    return verifySheetRow(SHEET, 'G', rowIndex, {
        0: expected.timestamp,
        1: expected.name,
        2: expected.description,
        3: expected.paymentDate,
        4: expected.amount
    }, DATES);
}

export async function submitFormExpense(formData: FormData) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        const name = String(formData.get('name') ?? '').trim();
        const description = String(formData.get('description') ?? '').trim();
        const paymentDate = formData.get('paymentDate') as string;
        const amount = Number(formData.get('amount'));
        const remark = String(formData.get('remark') ?? '').trim();
        const head = String(formData.get('head') ?? '').trim();

        if (!name) return { success: false, error: 'Name is required.' };
        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'Amount must be a number greater than 0.' };
        }

        // Built by hand so the date never shifts with the server's timezone.
        const formattedDate = toSheetDate(paymentDate);
        if (!formattedDate) return { success: false, error: 'Please enter a valid date.' };

        if (!HEADS.includes(head)) return { success: false, error: 'Head must be SaqlainiApp or Chanda.' };

        // A Chanda-head expense comes out of somebody's Chanda money (lib/cash.ts).
        const resolved = head === 'Chanda'
            ? await resolveHolder(formData.get('holder'), null)
            : { holder: '' };
        if ('error' in resolved) return { success: false, error: resolved.error };

        const values = [[
            // IST - the server clock is UTC, which put entries made between
            // midnight and 5:30 AM on the previous day.
            sheetTimestamp(),
            name,
            description,
            formattedDate,
            amount,
            remark,
            head,
            resolved.holder
        ]];

        await appendToSheet(`${SHEET}!A:H`, values);
        revalidateExpenseViews();

        return { success: true };
    } catch (error: any) {
        console.error('Error submitting form expense:', error);
        return { success: false, error: error.message };
    }
}

export async function getFormExpenseEntries(page: number = 1, perPage: number = 10) {
    const auth = await requireAdmin();
    if ('error' in auth) return { entries: [], total: 0, page, perPage, error: auth.error };

    try {
        // Raw values with dates as ISO - see payments.ts.
        const data = await readNormalizedRows(`${SHEET}!A:H`, DATES);

        if (!data || data.length <= 1) {
            return { entries: [], total: 0, page, perPage };
        }

        const entries = data.slice(1).reverse().map((row, idx) => ({
            rowIndex: data.length - idx - 1,
            timestamp: row[0] || '',
            name: row[1] || '',
            description: row[2] || '',
            paymentDate: row[3] || '',
            amount: row[4] || '',
            remark: row[5] || '',
            head: row[6] || '',
            holder: row[7] || ''
        }));

        const total = entries.length;
        const start = (page - 1) * perPage;
        const paginatedEntries = entries.slice(start, start + perPage);

        return { entries: paginatedEntries, total, page, perPage };
    } catch (error) {
        console.error('Error fetching form expense entries:', error);
        return { entries: [], total: 0, page, perPage };
    }
}

export async function updateFormExpenseEntry(rowIndex: number, data: any, expected: ExpenseRowGuard) {
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

        const head = String(data?.head ?? '').trim();
        if (!HEADS.includes(head)) return { success: false, error: 'Head must be SaqlainiApp or Chanda.' };

        // Judged by the entry's own timestamp: entries from before the opening
        // cash balances must stay without a holder (see resolveHolder).
        const resolved = head === 'Chanda'
            ? await resolveHolder(data?.holder, String(expected.timestamp ?? ''))
            : { holder: '' };
        if ('error' in resolved) return { success: false, error: resolved.error };

        // From column B: the timestamp is never edited, so it is not rewritten.
        const range = `${SHEET}!B${rowIndex + 1}:H${rowIndex + 1}`;
        const values = [[
            name,
            data.description ?? '',
            paymentDate,
            amount,
            data.remark ?? '',
            head,
            resolved.holder
        ]];

        await updateSheetRow(range, values);
        revalidateExpenseViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteFormExpenseEntry(rowIndex: number, expected: ExpenseRowGuard) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        // A stale rowIndex used to delete whichever row had moved into its place.
        const guardError = await assertRowUnchanged(rowIndex, expected);
        if (guardError) return { success: false, error: guardError };

        await deleteSheetRow(rowIndex, FORM_EXPENSES_SHEET_ID);
        revalidateExpenseViews();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { success: false, error: error.message };
    }
}
