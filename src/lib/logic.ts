import { User, Payment, MonthStatus, UserFinancialSummary } from '@/types';

/** Default monthly contribution when a member has no rate of their own. */
export const MONTHLY_RATE = 125;

/**
 * Collection tracking began in December 2021 (carried over from the PHP
 * cronjob). Gaps before this date are history, not dues.
 */
export const TRACKING_START_YEAR = 2021;
export const TRACKING_START_MONTH = 12;

export function isBeforeTrackingStart(year: number, month: number): boolean {
    return year < TRACKING_START_YEAR
        || (year === TRACKING_START_YEAR && month < TRACKING_START_MONTH);
}

/**
 * Only "Regular" members build up monthly dues.
 *
 * calculateBakayaStatus has always used `frequency !== 'Regular'`, but the
 * profile page only special-cased the exact string 'One Time'. A member whose
 * frequency was blank or anything else therefore had 0 dues stored on their
 * card and a full list of due months on their profile.
 */
export function accruesDues(frequency: string | null | undefined): boolean {
    return frequency === 'Regular';
}

/**
 * Distinct paid months **inside the tracking window**.
 *
 * `calculateBakayaStatus` counts expected months from the tracking start, so
 * feeding it payments from before that date subtracted months it never counted
 * in the first place and under-reported the dues.
 */
export function countTrackedPaidMonths(payments: Array<{ year: number; month: number }>): number {
    const months = new Set<string>();
    for (const p of payments) {
        if (isBeforeTrackingStart(p.year, p.month)) continue;
        months.add(`${p.year}-${p.month}`);
    }
    return months.size;
}

/**
 * Earliest month a member ever paid for - the anchor every due calculation
 * starts from. `undefined` when they have no payments at all, in which case
 * there is nothing to measure dues against.
 *
 * Callers used to open with `minYear = 9999` and pass that sentinel straight
 * through, which silently skipped calculateBakayaStatus's own fallback.
 */
export function findFirstPaymentMonth(
    payments: Array<{ year: number; month: number }>
): { year: number; month: number } | undefined {
    let first: { year: number; month: number } | undefined;
    for (const p of payments) {
        if (!first || p.year < first.year || (p.year === first.year && p.month < first.month)) {
            first = { year: p.year, month: p.month };
        }
    }
    return first;
}

/**
 * Ported logic from profile.php (Lines 54-91)
 * Calculates the payment history and due status for a user.
 */
export function calculateUserFinancials(user: User, payments: Payment[]): UserFinancialSummary {
    const { year: currentYear, month: currentMonth } = getIstNow();

    // Determine start date dynamically from payments (Logic from profile.php)
    const firstPayment = findFirstPaymentMonth(payments);

    const monthlyAmount = user.amount || MONTHLY_RATE;
    const memberAccruesDues = accruesDues(user.frequency);

    // Create a map for quick lookup: "YYYY-MM" -> amount
    const paymentMap = new Map<string, number>();
    let totalPaid = 0;

    payments.forEach(p => {
        const key = `${p.year}-${p.month.toString().padStart(2, '0')}`;
        // In PHP logic, it sums up payments for the same month.
        const existing = paymentMap.get(key) || 0;
        paymentMap.set(key, existing + p.amount);
        // totalPaid is sum of ALL raw payments, calculated once
    });
    // Iterate again to count totalPaid accurately from map or just sum raw payments?
    // profile.php does: SUM(amount) in SQL query for Total Paid.
    // loops through payment_result to build map.
    // I can just sum p.amount.
    totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const history: MonthStatus[] = [];
    let paidMonthsCount = 0;

    // Loop from the first payment to the current date (profile.php line 66).
    // With no payments there is no anchor to measure dues from, so the timeline
    // stays empty and the due count is 0 - which is what calculateBakayaStatus
    // (and therefore the member card) reports for the same member. Previously
    // this started at January of the current year and billed every month since,
    // so a member who had never paid showed 0 dues on their card and several on
    // their profile.
    const startYear = firstPayment ? firstPayment.year : currentYear + 1;
    const startMonth = firstPayment ? firstPayment.month : 1;

    for (let year = startYear; year <= currentYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 1;
        const monthEnd = (year === currentYear) ? currentMonth : 12;

        for (let month = monthStart; month <= monthEnd; month++) {
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

            const paidAmount = paymentMap.get(key);
            const isPaid = paidAmount !== undefined && paidAmount > 0;

            if (isPaid) {
                paidMonthsCount++;
                history.push({
                    year,
                    month,
                    monthName,
                    amount: paidAmount!,
                    status: 'paid',
                    // A month counts as cleared as soon as anything is paid against it
                    // (unchanged behaviour), but flag short payments so the UI can show them.
                    isPartial: paidAmount! < monthlyAmount
                });
            } else if (memberAccruesDues && !isBeforeTrackingStart(year, month)) {
                history.push({
                    year,
                    month,
                    monthName,
                    amount: 0,
                    status: 'due'
                });
            }
            // Unpaid months from before collection tracking began are skipped
            // entirely. They used to be listed as DUE here while `bakaya_month`
            // (which starts counting at the cutoff) ignored them, so the profile
            // page and the member card showed two different numbers.
            // Paid months before the cutoff are still shown, so no history is lost.
        }
    }

    // Calculate Due Months Count based on Gaps
    // Note: We use the calculated gaps to ensure consistency with the generated history timeline.
    // This makes the UI "smart" and independent of potentially stale DB 'bakaya_month' values.
    const calculatedDueMonthsCount = history.filter(h => h.status === 'due').length;

    // Non-Regular members never get due rows above, so this is already 0 for
    // them - the UI no longer has to override anything.

    return {
        totalPaid,
        paidMonthsCount,
        dueMonthsCount: calculatedDueMonthsCount, // Use dynamic calculation
        minDueAmount: calculatedDueMonthsCount * monthlyAmount, // Honour the user's own monthly rate
        avgMonthlyPayment: paidMonthsCount > 0 ? totalPaid / paidMonthsCount : 0,
        history: history.reverse() // Newest first
    };
}

export interface PaymentAllocation {
    year: number;
    month: number;
    monthName: string;
    amount: number;
}

/**
 * Current date in IST, regardless of where this runs (Node server or the
 * admin's browser). Previously the client used the browser's local timezone
 * while the server forced IST, so around a month boundary the two could
 * disagree about which month is "current".
 */
export function getIstNow(): { year: number; month: number } {
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(Date.now() + istOffset);
    return { year: istTime.getUTCFullYear(), month: istTime.getUTCMonth() + 1 };
}

function monthNameOf(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString('default', { month: 'long' });
}

/** Where the admin decided an ambiguous payment should go. */
export type AllocationChoice = 'oldest' | 'currentMonth';

/**
 * True when the destination of a payment is genuinely ambiguous and the admin
 * must decide, rather than the system picking silently:
 *
 *   - the current month has already been paid something, and
 *   - an older month is still due, and
 *   - the amount is worth recording but cannot clear a full older month
 *     (>= the current-month rate, < the monthly rate).
 *
 * In that window the money could sensibly either top up the current month or
 * go against the old due month, so the form asks instead of guessing.
 */
export function needsAllocationChoice(
    amount: number,
    history: MonthStatus[],
    monthlyRate: number = MONTHLY_RATE,
    frequency: string = 'Regular'
): boolean {
    if (!accruesDues(frequency)) return false;
    if (!Number.isFinite(amount) || amount <= 0) return false;

    const currentMonthRate = Math.min(100, monthlyRate);
    if (amount < currentMonthRate || amount >= monthlyRate) return false;

    const { year, month } = getIstNow();

    const current = history.find(h => h.year === year && h.month === month);
    if (!current || current.status !== 'paid') return false;

    return history.some(h =>
        h.status === 'due' && (h.year < year || (h.year === year && h.month < month))
    );
}

/** The current month's entry, used to show what has already been paid against it. */
export function findCurrentMonth(history: MonthStatus[]): MonthStatus | undefined {
    const { year, month } = getIstNow();
    return history.find(h => h.year === year && h.month === month);
}

/** Oldest still-due month - the default destination when the admin picks "oldest". */
export function findOldestDueMonth(history: MonthStatus[]): MonthStatus | undefined {
    return [...history]
        .filter(h => h.status === 'due')
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))[0];
}

/**
 * Smart Allocation Logic (FIFO)
 * Determines which months should be marked as paid given a bulk amount.
 * Distributes amount equally among clearable months.
 *
 * Single source of truth: the admin form (client) and processSmartPayment
 * (server) both call this, so they can never disagree about the current month
 * or about how an amount gets split.
 */
export function allocatePayment(
    amount: number,
    history: MonthStatus[],
    monthlyRate: number = MONTHLY_RATE,
    frequency: string = 'Regular',
    choice?: AllocationChoice
): PaymentAllocation[] {

    const allocations: PaymentAllocation[] = [];

    // Guard: nothing is allocatable for a missing, zero or negative amount.
    // Without this, a 0 / negative entry created a payment row anyway and still
    // decremented the user's due count.
    if (!Number.isFinite(amount) || amount <= 0) return allocations;

    const { year: currentYear, month: currentMonth } = getIstNow();

    // The admin deliberately sent this payment to the current month (see
    // needsAllocationChoice). The whole amount goes there, even though the
    // month may already be paid - that is what makes it a top-up.
    if (choice === 'currentMonth') {
        allocations.push({
            year: currentYear,
            month: currentMonth,
            monthName: monthNameOf(currentYear, currentMonth),
            amount
        });
        return allocations;
    }

    // Members who do not accrue dues (One Time, or no frequency set) have no
    // monthly schedule - the whole amount lands on the current month.
    const dueMonths = !accruesDues(frequency)
        ? []
        : [...history]
            .filter(h => h.status === 'due')
            .sort((a, b) => (a.year - b.year) || (a.month - b.month));

    // Minimum needed to clear a month; the current month gets the lower rate.
    const currentMonthRate = Math.min(100, monthlyRate);
    const minFor = (m: { year: number; month: number }) =>
        (m.year === currentYear && m.month === currentMonth) ? currentMonthRate : monthlyRate;

    // If no due months, allocate to current month
    if (dueMonths.length === 0) {
        allocations.push({
            year: currentYear,
            month: currentMonth,
            monthName: monthNameOf(currentYear, currentMonth),
            amount
        });
        return allocations;
    }

    const current = dueMonths.find(d => d.year === currentYear && d.month === currentMonth);

    // Special case: exactly the current-month rate, and current month is due
    if (amount === currentMonthRate && current) {
        allocations.push({
            year: current.year,
            month: current.month,
            monthName: current.monthName,
            amount
        });
        return allocations;
    }

    // Calculate how many months can be cleared with minimum amounts
    let remaining = amount;
    let clearableMonths = 0;
    for (const due of dueMonths) {
        const min = minFor(due);
        if (remaining >= min) {
            remaining -= min;
            clearableMonths++;
        } else {
            break;
        }
    }

    // Distribute amount equally among clearable months
    if (clearableMonths > 0) {
        const perMonth = Math.floor(amount / clearableMonths);
        const remainder = amount % clearableMonths;

        for (let i = 0; i < clearableMonths; i++) {
            allocations.push({
                year: dueMonths[i].year,
                month: dueMonths[i].month,
                monthName: dueMonths[i].monthName,
                amount: perMonth + (i < remainder ? 1 : 0)
            });
        }
    } else {
        // Amount is not enough to clear any month - allocate to current month if due, else oldest
        const targetMonth = current ?? dueMonths[0];
        allocations.push({
            year: targetMonth.year,
            month: targetMonth.month,
            monthName: targetMonth.monthName,
            amount
        });
    }

    return allocations;
}

/**
 * Calculates the exact 'bakaya_month' (Due Months) value for a user.
 * This logic mirrors the PHP cronjob 'insert_month.php'.
 */
export function calculateBakayaStatus(
    firstPaymentYear: number | undefined,
    firstPaymentMonth: number | undefined,
    totalPaidMonths: number,
    frequency: string = 'Regular'
): number {
    if (!accruesDues(frequency)) return 0;

    // No first payment means no anchor to measure dues from. Callers used to
    // pass a 9999 sentinel here, which produced a negative month count that
    // happened to clamp to 0 - correct by accident. Say it explicitly.
    if (!firstPaymentYear || !firstPaymentMonth) return 0;

    const { year: currentYear, month: currentMonth } = getIstNow();

    let startYear = firstPaymentYear;
    let startMonth = firstPaymentMonth;

    // PHP Logic: Filter out months before Dec 2021
    if (isBeforeTrackingStart(startYear, startMonth)) {
        startYear = TRACKING_START_YEAR;
        startMonth = TRACKING_START_MONTH;
    }

    // Calculate total expected months
    // Formula: ((DiffYears) * 12) + (DiffMonths) + 1 (inclusive)
    const yearDiff = currentYear - startYear;
    const monthDiff = currentMonth - startMonth;
    const totalExpectedMonths = (yearDiff * 12) + monthDiff + 1;

    let missingMonths = totalExpectedMonths - totalPaidMonths;

    // Ensure non-negative
    return Math.max(0, missingMonths);
}
