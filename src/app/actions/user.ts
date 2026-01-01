'use server'

import { createClient } from '@/lib/supabase/server';
import { User, Payment } from '@/types';
import { calculateUserFinancials, allocatePayment } from '@/lib/logic';
import { appendToSheet } from '@/lib/sheets';
import { revalidatePath } from 'next/cache';

export async function getUserProfile(userId: number) {
    const supabase = await createClient();

    // Fetch User
    const { data: userData, error: userError } = await supabase
        .from('user_list')
        .select('*')
        .eq('id', userId)
        .single();

    if (userError || !userData) {
        return { error: 'User not found' };
    }

    // Fetch Payments
    const { data: paymentData, error: paymentError } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', userId);

    if (paymentError) {
        return { error: 'Failed to fetch payments' };
    }

    const user: User = userData;
    const payments: Payment[] = paymentData || [];

    const financials = calculateUserFinancials(user, payments);

    return { user, financials, payments };
}

export async function processSmartPayment(
    userId: number, 
    amount: number, 
    remarks: Record<string, string> = {},
    customAllocations?: Array<{year: number, month: number, amount: number}>
) {
    const supabase = await createClient();

    // 1. Get current status
    const result = await getUserProfile(userId);

    if ('error' in result) {
        return { error: result.error };
    }

    const { user, financials } = result;
    if (!user || !financials) return { error: 'Invalid user data' };

    // 2. Calculate Allocation
    let allocations;
    if (customAllocations && customAllocations.length > 0) {
        // Use custom allocations if provided
        allocations = customAllocations;
    } else {
        // Otherwise calculate automatically
        allocations = allocatePayment(amount, financials.history);
    }

    if (allocations.length === 0) {
        return { error: 'Unable to allocate payment.' };
    }

    // 3. Insert Payments - Get max ID first
    const { data: maxIdData } = await supabase
        .from('payment')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
    
    let nextId = (maxIdData && maxIdData[0]?.id) ? maxIdData[0].id + 1 : 1;
    
    const paymentsToInsert = allocations.map(a => ({
        id: nextId++,
        user_id: userId,
        month: a.month,
        year: a.year,
        amount: a.amount,
        date: new Date().toISOString().split('T')[0]
    }));

    const { error: insertError } = await supabase
        .from('payment')
        .insert(paymentsToInsert);

    if (insertError) {
        console.error('Payment insert error:', insertError);
        return { error: `Failed to record payments: ${insertError.message}` };
    }

    // 4. Update User's Bakaya Month (Decrement)
    const monthsPaid = Math.floor(amount / 125);
    const newBakaya = Math.max(0, user.bakaya_month - monthsPaid);

    await supabase
        .from('user_list')
        .update({ bakaya_month: newBakaya })
        .eq('id', userId);

    // 5. Add to Google Sheet - Individual entries for each allocated month
    try {
        const now = new Date();
        const timestamp = now.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
        const paymentDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        
        const rows = allocations.map(allocation => {
            const monthName = new Date(allocation.year, allocation.month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
            const monthKey = `${allocation.year}-${allocation.month}`;
            return [
                timestamp,
                `${user.name} / ${user.fname || ''}`,
                paymentDate,
                allocation.amount,
                allocation.month,
                monthName,
                allocation.year,
                remarks[monthKey] || ''
            ];
        });
        
        await appendToSheet('FormResponses!A:H', rows);
    } catch (sheetError) {
        console.error('Failed to add to Google Sheet:', sheetError);
    }

    revalidatePath('/');
    revalidatePath(`/profile/${userId}`);
    return { success: true, allocated: allocations };
}

export async function createNewUserPayment(data: {
    name: string;
    fname: string;
    phone: string;
    amount: string;
    frequency: 'Regular' | 'One Time';
    remarks: string;
}) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const amount = parseInt(data.amount);

    if (!data.name || !data.fname || !data.phone || amount <= 0) {
        return { error: 'Invalid input data' };
    }

    // Add to Google Sheet only
    try {
        const now = new Date();
        const timestamp = now.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
        const paymentDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const monthFormatted = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        
        const row = [
            timestamp,
            `${data.name} / ${data.fname}`,
            paymentDate,
            amount,
            currentMonth,
            monthFormatted,
            currentYear,
            data.phone,
            data.remarks || '',
            '', // Payment Screenshot Upload - blank
            data.frequency // EntryPayment Frequency
        ];
        
        await appendToSheet('FormResponses!A:K', [row]);
    } catch (sheetError) {
        console.error('Failed to add to Google Sheet:', sheetError);
        return { error: 'Failed to add entry to Google Sheet' };
    }

    revalidatePath('/');
    return { success: true };
}
