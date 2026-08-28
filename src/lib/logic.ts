import { User, Payment, MonthStatus, UserFinancialSummary } from '@/types';

/**
 * Ported logic from profile.php (Lines 54-91)
 * Calculates the payment history and due status for a user.
 */
export function calculateUserFinancials(user: User, payments: Payment[]): UserFinancialSummary {
    const { year: currentYear, month: currentMonth } = getIstNow();

    // Determine start date dynamically from payments (Logic from profile.php)
    let startYear = currentYear;
    let startMonth = 1;

    if (payments.length > 0) {
        let minYear = 9999;
        let minMonth = 12;

        payments.forEach(p => {
            if (p.year < minYear) {
                minYear = p.year;
                minMonth = p.month;
            } else if (p.year === minYear) {
                if (p.month < minMonth) {
                    minMonth = p.month;
                }
            }
        });
        startYear = minYear;
        startMonth = minMonth;
    } else {
        // Default to current year if no payments (profile.php behavior)
        startYear = currentYear;
        startMonth = 1;
    }

    const monthlyAmount = user.amount || 125; // Default to 125 if not set

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

    // Loop from start date to current date (profile.php line 66)
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
            } else {
                // Only count as due if user is Regular (profile.php logic implies this check for display)
                // But for calculation we track all gaps.
                // profile.php line 87: if (!isset($payments[$key])) { $total_due += $monthly_amount; }
                // Wait, profile.php calculates $total_due but then uses $user['bakaya_month'] for the stat card.
                // We will calculate the *actual* gaps here.

                history.push({
                    year,
                    month,
                    monthName,
                    amount: 0,
                    status: 'due'
                });
            }
        }
    }

    // Calculate Due Months Count based on Gaps
    // Note: We use the calculated gaps to ensure consistency with the generated history timeline.
    // This makes the UI "smart" and independent of potentially stale DB 'bakaya_month' values.
    const calculatedDueMonthsCount = history.filter(h => h.status === 'due').length;

    // For "Not Regular" / "One Time", due count is effectively 0 for display, 
    // but the function returns the raw calculated gaps. The UI handles the 0 override.

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
    monthlyRate: number = 125,
    frequency: string = 'Regular'
): PaymentAllocation[] {

    const allocations: PaymentAllocation[] = [];

    // Guard: nothing is allocatable for a missing, zero or negative amount.
    // Without this, a 0 / negative entry created a payment row anyway and still
    // decremented the user's due count.
    if (!Number.isFinite(amount) || amount <= 0) return allocations;

    const { year: currentYear, month: currentMonth } = getIstNow();

    // "One Time" payers have no monthly schedule, so nothing is ever "due" for
    // them - the whole amount lands on the current month.
    const dueMonths = frequency === 'One Time'
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
    if (frequency !== 'Regular') return 0;

    const { year: currentYear, month: currentMonth } = getIstNow();

    // Default start date (from PHP logic)
    // If first_payment is not set, we might assume they just started or handle it gracefully.
    // PHP Logic: $start_year = $user['first_payment_year'] ?: date('Y');
    let startYear = firstPaymentYear || currentYear;
    let startMonth = firstPaymentMonth || 1;

    // PHP Logic: Filter out months before Dec 2021
    // $start_period = new DateTime('2021-12-01');
    const cutoffYear = 2021;
    const cutoffMonth = 12;

    if (startYear < cutoffYear || (startYear === cutoffYear && startMonth < cutoffMonth)) {
        startYear = cutoffYear;
        startMonth = cutoffMonth;
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
