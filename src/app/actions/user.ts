'use server'

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { User, Payment, PaymentActionResult, SimpleActionResult } from '@/types';
import { calculateUserFinancials, allocatePayment, calculateBakayaStatus, getIstNow, needsAllocationChoice, countTrackedPaidMonths, findFirstPaymentMonth, MONTHLY_RATE, AllocationChoice } from '@/lib/logic';
import { appendToSheet } from '@/lib/sheets';
import { revalidatePath } from 'next/cache';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Timestamps for the Google Sheet, always in IST.
 * `new Date().toLocaleString()` follows the *server's* timezone, which is UTC
 * on Vercel - that put late-evening entries on the wrong date.
 */
function istStamp() {
    const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const y = ist.getUTCFullYear();
    const m = pad(ist.getUTCMonth() + 1);
    const d = pad(ist.getUTCDate());
    const date = `${m}/${d}/${y}`;
    return {
        date,
        timestamp: `${date} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`,
        isoDate: `${y}-${m}-${d}`
    };
}

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

    const user: User = {
        ...userData,
        hasImage: true
    };
    const payments: Payment[] = paymentData || [];

    const financials = calculateUserFinancials(user, payments);

    return { user, financials, payments };
}

/**
 * Recomputes `bakaya_month` from the payment rows that actually exist, using the
 * same function the Sheets sync uses. Decrementing the stored value by "months
 * cleared" let the admin panel and the sync drift apart, and could drive a stale
 * stored value to 0 while months were still due.
 */
async function recalculateBakaya(supabase: any, userId: number, frequency: string) {
    const { data: payments, error } = await supabase
        .from('payment')
        .select('year, month')
        .eq('user_id', userId);

    if (error || !payments) {
        return `Payments were saved, but the due-month count could not be refreshed${error ? `: ${error.message}` : ''}.`;
    }

    // Only months inside the tracking window count here - calculateBakayaStatus
    // measures expected months from the same cutoff.
    const distinctPaidMonths = countTrackedPaidMonths(payments);

    const firstPayment = findFirstPaymentMonth(payments);

    const newBakaya = calculateBakayaStatus(
        firstPayment?.year,
        firstPayment?.month,
        distinctPaidMonths,
        frequency
    );

    const { error: updateError } = await supabase
        .from('user_list')
        .update({ bakaya_month: newBakaya })
        .eq('id', userId);

    if (updateError) {
        return `Payments were saved, but the due-month count could not be updated: ${updateError.message}`;
    }
    return null;
}

export async function processSmartPayment(
    userId: number,
    amount: number,
    remarks: Record<string, string> = {},
    customAllocations?: Array<{ year: number, month: number, monthName?: string, amount: number }>,
    allocationChoice?: AllocationChoice,
    /**
     * Months the form could see were ALREADY paid and is deliberately adding to
     * anyway (an up-to-date member paying again, an advance, a top-up).
     *
     * This is what separates an intentional extra payment from a stale form:
     * a stale form still believes those months are due, so it never lists them
     * here and the duplicate guard below still catches it.
     */
    acknowledgedPaidMonths?: string[]
): Promise<PaymentActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    if (!Number.isInteger(userId) || userId <= 0) {
        return { error: 'Invalid user.' };
    }
    if (!Number.isInteger(amount) || amount <= 0) {
        return { error: 'Paid amount must be a whole number greater than 0.' };
    }

    const supabase = await createClient();

    // 1. Get current status
    const result = await getUserProfile(userId);

    if ('error' in result) {
        return { error: result.error };
    }

    const { user, financials } = result;
    if (!user || !financials) return { error: 'Invalid user data' };

    // 2. Ambiguous destination? The admin has to say where the money goes -
    // enforced here too, not just in the form, so a stale or hand-made request
    // cannot slip past the prompt.
    const mustChoose = needsAllocationChoice(amount, financials.history, MONTHLY_RATE, user.frequency);
    if (mustChoose && allocationChoice !== 'oldest' && allocationChoice !== 'currentMonth') {
        return { error: 'This amount could top up the current month or go against an older due month. Please choose one and submit again.' };
    }

    // 3. Calculate Allocation
    let allocations: Array<{ year: number; month: number; monthName?: string; amount: number }>;
    if (customAllocations && customAllocations.length > 0) {
        allocations = customAllocations;
    } else {
        allocations = allocatePayment(amount, financials.history, MONTHLY_RATE, user.frequency, allocationChoice);
    }

    if (allocations.length === 0) {
        return { error: 'Unable to allocate payment.' };
    }

    // 4. Re-validate on the server. The client's allocation can be stale (or
    // tampered with), so never take it on trust.
    const { year: currentYear, month: currentMonth } = getIstNow();
    const paidKeys = new Set(
        financials.history.filter(h => h.status === 'paid').map(h => `${h.year}-${h.month}`)
    );
    // Already-paid months the form knowingly targeted.
    const acknowledged = new Set(acknowledgedPaidMonths ?? []);
    // Picking "top up the current month" in the ambiguous-amount prompt is itself
    // an acknowledgement.
    if (mustChoose && allocationChoice === 'currentMonth') {
        acknowledged.add(`${currentYear}-${currentMonth}`);
    }
    const seen = new Set<string>();
    let allocatedTotal = 0;

    for (const a of allocations) {
        if (!Number.isInteger(a.year) || !Number.isInteger(a.month) || a.month < 1 || a.month > 12) {
            return { error: 'Allocation contains an invalid month or year.' };
        }
        if (!Number.isInteger(a.amount) || a.amount <= 0) {
            return { error: 'Every allocated month needs a whole amount greater than 0.' };
        }
        if (a.year > currentYear || (a.year === currentYear && a.month > currentMonth)) {
            return { error: 'Cannot record a payment against a future month.' };
        }

        const key = `${a.year}-${a.month}`;
        if (seen.has(key)) {
            return { error: 'The same month appears twice in this payment.' };
        }
        seen.add(key);

        if (paidKeys.has(key) && !acknowledged.has(key)) {
            return { error: `${a.monthName || key} is already paid. Please reload the form and try again.` };
        }

        allocatedTotal += a.amount;
    }

    if (allocatedTotal !== amount) {
        return { error: `Allocated total (Rs ${allocatedTotal}) does not match the paid amount (Rs ${amount}).` };
    }

    // 5. Insert Payments.
    // `id` is assigned here rather than by the database, so two admins saving at
    // the same moment can pick the same id. Retry on a unique violation.
    // The durable fix is an identity/sequence default on payment.id.
    const { isoDate } = istStamp();
    let insertError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
        const { data: maxIdData, error: maxIdError } = await supabase
            .from('payment')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (maxIdError) {
            return { error: `Failed to reserve payment ids: ${maxIdError.message}` };
        }

        let nextId = (maxIdData?.[0]?.id ?? 0) + 1;

        const paymentsToInsert = allocations.map(a => ({
            id: nextId++,
            user_id: userId,
            month: a.month,
            year: a.year,
            amount: a.amount,
            date: isoDate
        }));

        const { error } = await supabase.from('payment').insert(paymentsToInsert);

        if (!error) {
            insertError = null;
            break;
        }

        insertError = error;
        // 23505 = unique_violation -> someone else took our ids, retry with a fresh max
        if (error.code !== '23505') break;
    }

    if (insertError) {
        console.error('Payment insert error:', insertError);
        return { error: `Failed to record payments: ${insertError.message}` };
    }

    // 6. Recalculate the user's due months from the real data
    const warnings: string[] = [];
    const bakayaWarning = await recalculateBakaya(supabase, userId, user.frequency);
    if (bakayaWarning) warnings.push(bakayaWarning);

    // 7. Add to Google Sheet - Individual entries for each allocated month
    try {
        const { timestamp, date: paymentDate } = istStamp();

        const rows = allocations.map(allocation => {
            const monthFormatted = `${pad(allocation.month)}/01/${allocation.year}`;
            const monthKey = `${allocation.year}-${allocation.month}`;
            return [
                timestamp,
                `${user.name} / ${user.fname || ''}`,
                paymentDate,
                allocation.amount,
                allocation.month,
                monthFormatted,
                allocation.year,
                '', // Index 7 (Phone) - Empty for existing users via smart payment
                remarks[monthKey] || '' // Index 8 (Remarks)
            ];
        });

        // 9 columns (A..I) - the range used to say A:H, which did not cover Remarks.
        await appendToSheet('FormResponses!A:I', rows);
    } catch (sheetError: any) {
        console.error('Failed to add to Google Sheet:', sheetError);
        warnings.push(`Payment saved to the database, but the Google Sheet could not be updated: ${sheetError?.message || 'unknown error'}`);
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath(`/profile/${userId}`);
    return {
        success: true,
        allocated: allocations,
        warning: warnings.length > 0 ? warnings.join(' ') : undefined
    };
}

export async function createNewUserPayment(data: {
    name: string;
    fname: string;
    phone: string;
    amount: string;
    frequency: 'Regular' | 'One Time';
    remarks: string;
}): Promise<SimpleActionResult> {
    const auth = await requireAdmin();
    if ('error' in auth) return { error: auth.error };

    const name = (data.name || '').trim();
    const fname = (data.fname || '').trim();
    const phone = (data.phone || '').trim();
    const remarks = (data.remarks || '').trim();
    const amount = Number(data.amount);

    if (!name || !fname) {
        return { error: 'Name and father name are required.' };
    }
    // This used to use `parseInt`, and `NaN <= 0` is false - so a blank or
    // non-numeric amount slipped through and landed in the sheet as an empty cell.
    if (!Number.isInteger(amount) || amount <= 0) {
        return { error: 'Amount must be a whole number greater than 0.' };
    }
    if (!/^\d{10}$/.test(phone.replace(/[\s-]/g, ''))) {
        return { error: 'Mobile number must be 10 digits.' };
    }
    if (data.frequency !== 'Regular' && data.frequency !== 'One Time') {
        return { error: 'Invalid payment frequency.' };
    }

    const { year: currentYear, month: currentMonth } = getIstNow();

    // Add to Google Sheet only
    try {
        const { timestamp, date: paymentDate } = istStamp();
        const monthFormatted = `${pad(currentMonth)}/01/${currentYear}`;

        const row = [
            timestamp,
            `${name} / ${fname}`,
            paymentDate,
            amount,
            currentMonth,
            monthFormatted,
            currentYear,
            phone, // Index 7: Phone first
            remarks, // Index 8: Remarks second
            '', // Payment Screenshot Upload - blank
            data.frequency // EntryPayment Frequency
        ];

        await appendToSheet('FormResponses!A:K', [row]);
    } catch (sheetError: any) {
        console.error('Failed to add to Google Sheet:', sheetError);
        return { error: `Failed to add entry to Google Sheet: ${sheetError?.message || 'unknown error'}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
}
