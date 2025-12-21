'use server'

import { createClient } from '@/lib/supabase/server';
import { User, Payment } from '@/types';
import { calculateUserFinancials, allocatePayment } from '@/lib/logic';
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

    return { user, financials };
}

export async function processSmartPayment(userId: number, amount: number) {
    const supabase = await createClient();

    // 1. Get current status
    const result = await getUserProfile(userId);

    if ('error' in result) {
        return { error: result.error };
    }

    const { user, financials } = result;
    if (!user || !financials) return { error: 'Invalid user data' };

    // 2. Calculate Allocation
    const allocations = allocatePayment(amount, financials.history);

    if (allocations.length === 0) {
        return { error: 'No due months to allocate payment to.' };
    }

    // 3. Insert Payments
    const paymentsToInsert = allocations.map(a => ({
        user_id: userId,
        month: a.month,
        year: a.year,
        amount: a.amount,
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    }));

    const { error: insertError } = await supabase
        .from('payment')
        .insert(paymentsToInsert);

    if (insertError) {
        return { error: 'Failed to record payments.' };
    }

    // 4. Update User's Bakaya Month (Decrement)
    // Logic: New Bakaya = Old Bakaya - Full Months Paid
    // Note: This assumes 125 = 1 Month.
    const monthsPaid = Math.floor(amount / 125);
    const newBakaya = Math.max(0, user.bakaya_month - monthsPaid);

    await supabase
        .from('user_list')
        .update({ bakaya_month: newBakaya })
        .eq('id', userId);

    revalidatePath('/');
    revalidatePath(`/profile/${userId}`);
    return { success: true, allocated: allocations };
}
