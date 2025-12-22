import { User, Payment, MonthStatus, UserFinancialSummary } from '@/types';

/**
 * Ported logic from profile.php (Lines 54-91)
 * Calculates the payment history and due status for a user.
 */
export function calculateUserFinancials(user: User, payments: Payment[]): UserFinancialSummary {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

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
    let dueMonthsCount = 0; // This is calculated dynamically, distinct from user.bakaya_month

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
                    status: 'paid'
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
        minDueAmount: calculatedDueMonthsCount * 125, // Calculate amount based on dynamic count
        avgMonthlyPayment: paidMonthsCount > 0 ? totalPaid / paidMonthsCount : 0,
        history: history.reverse() // Newest first
    };
}

/**
 * Smart Allocation Logic (FIFO)
 * Determines which months should be marked as paid given a bulk amount.
 * Distributes amount equally among clearable months.
 */
export function allocatePayment(
    amount: number,
    history: MonthStatus[],
    monthlyRate: number = 125
): { year: number; month: number; amount: number }[] {

    const allocations: { year: number; month: number; amount: number }[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Filter for due months and sort by Oldest First (FIFO)
    const dueMonths = [...history]
        .filter(h => h.status === 'due')
        .sort((a, b) => (a.year - b.year) || (a.month - b.month));

    const hasCurrentMonth = dueMonths.some(d => d.year === currentYear && d.month === currentMonth);
    
    // Special case: exactly 100 and current month is due
    if (amount === 100 && hasCurrentMonth) {
        const current = dueMonths.find(d => d.year === currentYear && d.month === currentMonth);
        if (current) {
            allocations.push({
                year: current.year,
                month: current.month,
                amount: 100
            });
        }
        return allocations;
    }

    // Calculate how many months can be cleared with minimum amounts
    let remaining = amount;
    let clearableMonths = 0;
    for (let i = 0; i < dueMonths.length; i++) {
        const isCurrent = dueMonths[i].year === currentYear && dueMonths[i].month === currentMonth;
        const min = isCurrent ? 100 : 125;
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
            const allocAmount = perMonth + (i < remainder ? 1 : 0);
            allocations.push({
                year: dueMonths[i].year,
                month: dueMonths[i].month,
                amount: allocAmount
            });
        }
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

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

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
