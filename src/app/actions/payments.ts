'use server'

import { getSheetData, updateSheetRow, deleteSheetRow } from '@/lib/sheets';
import { revalidatePath } from 'next/cache';

export async function getPaymentEntries(page: number = 1, perPage: number = 10) {
    try {
        const data = await getSheetData('FormResponses!A:I');

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
        const start = (page - 1) * perPage;
        const paginatedEntries = entries.slice(start, start + perPage);

        return { entries: paginatedEntries, total, page, perPage };
    } catch (error) {
        console.error('Error fetching payment entries:', error);
        return { entries: [], total: 0, page, perPage };
    }
}

export async function updatePaymentEntry(rowIndex: number, data: any) {
    try {
        const range = `FormResponses!A${rowIndex + 1}:I${rowIndex + 1}`;
        const values = [[
            data.timestamp,
            data.name,
            data.paymentDate,
            data.amount,
            data.month,
            data.monthName,
            data.year,
            data.phone,   // Index 7
            data.remarks  // Index 8
        ]];

        await updateSheetRow(range, values);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { error: error.message };
    }
}

export async function deletePaymentEntry(rowIndex: number) {
    try {
        await deleteSheetRow(rowIndex, 212977166);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { error: error.message };
    }
}
