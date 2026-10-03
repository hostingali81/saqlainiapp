'use server'

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { User, Payment, PaymentActionResult, SimpleActionResult } from '@/types';
import { calculateUserFinancials, allocatePayment, calculateBakayaStatus, getIstNow, needsAllocationChoice, countTrackedPaidMonths, findFirstPaymentMonth, MONTHLY_RATE, AllocationChoice } from '@/lib/logic';
import { appendToSheet, getSheetData, parseRowSpan } from '@/lib/sheets';
import { normalizeFullname, paymentIdForRow } from '@/lib/sheet-ids';
import { istNow } from '@/lib/dates';
import { syncPaymentsFromSheet } from '@/lib/sync-logic';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Timestamps for the Google Sheet, always in IST.
 * `new Date().toLocaleString()` follows the *server's* timezone, which is UTC
 * on Vercel - that put late-evening entries on the wrong date.
 *
 * ISO text, because Sheets reads ISO the same way in every locale; the
 * columns' DD/MM/YYYY format takes care of how it looks. (MM/DD/YYYY text was
 * only read correctly while the sheet stayed in a US locale.)
 */
function istStamp() {
    const { date, time } = istNow();
    return {
        date,
        timestamp: `${date} ${time}`,
        isoDate: date
    };
}

/** Month_F: the first day of the paid month, as an ISO date. */
const monthCell = (year: number, month: number) => `${year}-${pad(month)}-01`;

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

/**
 * Copies freshly appended FormResponses rows into the `payment` table under
 * the payment_id the sheet itself assigns them (their position - see
 * sheet-ids.ts). Returns why it could not, or null on success.
 */
async function mirrorPaymentsToDb(
    appendedRange: string | null | undefined,
    fullname: string,
    userId: number,
    allocations: Array<{ year: number; month: number; amount: number }>,
    isoDate: string
): Promise<string | null> {
    const span = parseRowSpan(appendedRange);
    if (!span || span.end - span.start + 1 !== allocations.length) {
        return 'the sheet did not report where the rows were added';
    }

    let names: unknown[];
    try {
        names = (await getSheetData(`FormResponses!B2:B${span.end}`)).map(r => r?.[0]);
    } catch (e: any) {
        return `could not re-read the sheet: ${e?.message || 'unknown error'}`;
    }

    // Another admin deleting a row at the same moment would shift ours.
    for (let row = span.start; row <= span.end; row++) {
        if (String(names[row - 2] ?? '') !== fullname) {
            return 'the sheet rows moved while saving';
        }
    }

    const records = allocations.map((a, i) => ({
        id: paymentIdForRow(names, span.start + i),
        user_id: userId,
        month: a.month,
        year: a.year,
        amount: a.amount,
        date: isoDate
    }));

    // Upsert: if the database is behind the sheet, that id may still hold an
    // old row - the sheet says it is this payment now. Service-role client
    // because requireAdmin has already passed, and an upsert also needs UPDATE
    // rights on `payment`, which RLS may not give the admin's session.
    const { error } = await createAdminClient().from('payment').upsert(records);
    return error ? error.message : null;
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

    // 3. Calculate Allocation. The choice only counts while it is being asked
    // for - same rule as the form.
    const choice = mustChoose ? allocationChoice : undefined;
    const serverAllocations = allocatePayment(amount, financials.history, MONTHLY_RATE, user.frequency, choice);

    let allocations: Array<{ year: number; month: number; monthName?: string; amount: number }>;
    if (customAllocations && customAllocations.length > 0) {
        // The form may only change the per-month AMOUNTS, never which months
        // get paid. Without this, a form still holding another member's (or an
        // outdated) due list could file the payment against months this member
        // does not owe - nothing below would have caught it.
        const expected = new Set(serverAllocations.map(a => `${a.year}-${a.month}`));
        const sameMonths = customAllocations.length === expected.size
            && customAllocations.every(a => expected.has(`${a.year}-${a.month}`));
        if (!sameMonths) {
            return { error: "This member's due months have changed since the form loaded. Please select the member again and re-enter the payment." };
        }
        allocations = customAllocations;
    } else {
        allocations = serverAllocations;
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

    // 5. The member's exact fullname as the sheet knows it. FormResponses rows
    // are tied to members by fullname (DB!A, and a VLOOKUP in DB_PAYMENT). This
    // used to write `${name} / ${fname}`, which does not reproduce the original
    // for members with no "/" in their name or different spacing - the sheet
    // took it for a NEW member and the payment moved to that phantom at the
    // next sync, while the real member's month showed as due again.
    let fullname: string;
    try {
        const members = await getSheetData('DB!A2:B');
        const row = members.find(r => Number(r?.[1]) === userId);
        if (!row?.[0]) {
            return { error: 'This member was not found in the Google Sheet. Please run Sync and try again.' };
        }
        // Member ids are positions in the sheet (see sheet-ids.ts). If this id
        // now belongs to someone else, the app's member list is out of date.
        if (normalizeFullname(row[0]) !== normalizeFullname(`${user.name} / ${user.fname || ''}`)) {
            return { error: 'The member list in the Google Sheet has changed since the last sync. Please run Sync and try again.' };
        }
        fullname = String(row[0]);
    } catch (e: any) {
        return { error: `Could not read the member list from the Google Sheet, so nothing was saved: ${e?.message || 'unknown error'}` };
    }

    // 6. Google Sheet FIRST - it is the source of truth: a sync makes the
    // database match it and deletes anything it does not list. Writing the
    // database first meant a failed sheet write left a payment behind that the
    // next sync silently deleted. Now a failed write saves nothing at all.
    const { timestamp, date: paymentDate, isoDate } = istStamp();
    const rows = allocations.map(allocation => {
        const monthFormatted = monthCell(allocation.year, allocation.month);
        const monthKey = `${allocation.year}-${allocation.month}`;
        return [
            timestamp,
            fullname,
            paymentDate,
            allocation.amount,
            allocation.month,
            monthFormatted,
            allocation.year,
            '', // Index 7 (Phone) - Empty for existing users via smart payment
            remarks[monthKey] || '' // Index 8 (Remarks)
        ];
    });

    let appendedRange: string | null | undefined;
    try {
        // 9 columns (A..I) - the range used to say A:H, which did not cover Remarks.
        const appended = await appendToSheet('FormResponses!A:I', rows);
        appendedRange = appended.updates?.updatedRange;
    } catch (sheetError: any) {
        console.error('Failed to add to Google Sheet:', sheetError);
        return { error: `Could not save to the Google Sheet, so nothing was recorded. Please try again. (${sheetError?.message || 'unknown error'})` };
    }

    // 7. Copy into the database under the ids the sheet just gave these rows,
    // so the app shows the payment straight away and the next sync has nothing
    // to change. (The old `max(id) + 1` guess drifted from the sheet's own
    // numbering.) If that is not possible, a sync copies the sheet as-is.
    const warnings: string[] = [];
    const mirrorProblem = await mirrorPaymentsToDb(appendedRange, fullname, userId, allocations, isoDate);
    if (mirrorProblem) {
        console.warn(`Direct database copy skipped (${mirrorProblem}); running a payment sync instead.`);
        const syncProblem = await syncPaymentsFromSheet();
        if (syncProblem) {
            warnings.push(`Saved in the Google Sheet, but the app could not be updated yet (${syncProblem}). It will appear after the next Sync - do not enter it again.`);
        }
    }

    // 8. Recalculate the user's due months from the real data
    const bakayaWarning = await recalculateBakaya(supabase, userId, user.frequency);
    if (bakayaWarning) warnings.push(bakayaWarning);

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

    // Single spaces only: the fullname becomes the member's key in the sheet.
    const name = (data.name || '').replace(/\s+/g, ' ').trim();
    const fname = (data.fname || '').replace(/\s+/g, ' ').trim();
    const phone = (data.phone || '').trim();
    const remarks = (data.remarks || '').trim();
    const amount = Number(data.amount);

    if (!name || !fname) {
        return { error: 'Name and father name are required.' };
    }
    // The sheet splits the fullname on "/" into name and father name.
    if (name.includes('/') || fname.includes('/')) {
        return { error: 'Name and father name cannot contain "/".' };
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

    const fullname = `${name} / ${fname}`;

    // The sheet treats every new fullname as a new member (UNIQUE over
    // FormResponses), so the same person typed with different case or spacing
    // would become a second member with their own id and due months.
    try {
        const existing = await getSheetData('DB!A2:A');
        const wanted = normalizeFullname(fullname);
        const match = existing.find(r => r?.[0] && normalizeFullname(r[0]) === wanted);
        if (match) {
            return { error: `"${match[0]}" is already a member. Select them from the list instead of adding a new entry.` };
        }
    } catch (e: any) {
        return { error: `Could not check the existing members in the Google Sheet: ${e?.message || 'unknown error'}` };
    }

    const { year: currentYear, month: currentMonth } = getIstNow();

    // Add to Google Sheet only
    try {
        const { timestamp, date: paymentDate } = istStamp();
        const monthFormatted = monthCell(currentYear, currentMonth);

        const row = [
            timestamp,
            fullname,
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
