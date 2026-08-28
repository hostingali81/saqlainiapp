'use server';

import { appendToSheet, getSheetData, updateSheetRow, deleteSheetRow } from '@/lib/sheets';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function submitFormChanda(formData: FormData) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        const name = formData.get('name') as string;
        const nameHindi = formData.get('nameHindi') as string;
        const paymentDate = formData.get('paymentDate') as string;
        const amount = formData.get('amount') as string;
        const remarks = formData.get('remarks') as string || '';

        const timestamp = new Date().toLocaleString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });

        const formattedDate = new Date(paymentDate).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        const values = [[
            timestamp,
            name,
            nameHindi,
            formattedDate,
            amount,
            remarks
        ]];

        await appendToSheet('FormChanda!A:F', values);
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
        const data = await getSheetData('FormChanda!A:F');
        
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

export async function updateFormChandaEntry(rowIndex: number, data: any) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        const range = `FormChanda!A${rowIndex + 1}:F${rowIndex + 1}`;
        const values = [[
            data.timestamp,
            data.name,
            data.nameHindi,
            data.paymentDate,
            data.amount,
            data.remarks
        ]];
        
        await updateSheetRow(range, values);
        revalidatePath('/admin/form-chanda');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteFormChandaEntry(rowIndex: number) {
    const auth = await requireAdmin();
    if ('error' in auth) return { success: false, error: auth.error };

    try {
        await deleteSheetRow(rowIndex, 639752441);
        revalidatePath('/admin/form-chanda');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { success: false, error: error.message };
    }
}
