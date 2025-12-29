'use server';

import { appendToSheet, getSheetData, updateSheetRow, deleteSheetRow } from '@/lib/sheets';
import { revalidatePath } from 'next/cache';

export async function submitFormExpense(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const paymentDate = formData.get('paymentDate') as string;
        const amount = formData.get('amount') as string;
        const remark = formData.get('remark') as string || '';
        const head = formData.get('head') as string;

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
            description,
            formattedDate,
            amount,
            remark,
            head
        ]];

        await appendToSheet('FormExpenses!A:G', values);
        revalidatePath('/admin/form-expenses');
        
        return { success: true };
    } catch (error: any) {
        console.error('Error submitting form expense:', error);
        return { success: false, error: error.message };
    }
}

export async function getFormExpenseEntries(page: number = 1, perPage: number = 10) {
    try {
        const data = await getSheetData('FormExpenses!A:G');
        
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
            head: row[6] || ''
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

export async function updateFormExpenseEntry(rowIndex: number, data: any) {
    try {
        const range = `FormExpenses!A${rowIndex + 1}:G${rowIndex + 1}`;
        const values = [[
            data.timestamp,
            data.name,
            data.description,
            data.paymentDate,
            data.amount,
            data.remark,
            data.head
        ]];
        
        await updateSheetRow(range, values);
        revalidatePath('/admin/form-expenses');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating entry:', error);
        return { error: error.message };
    }
}

export async function deleteFormExpenseEntry(rowIndex: number) {
    try {
        await deleteSheetRow(rowIndex, 958087616);
        revalidatePath('/admin/form-expenses');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting entry:', error);
        return { error: error.message };
    }
}
