import { fetchAllRows } from '@/lib/fetch-all';

/**
 * Money left in the SaqlainiApp fund: every monthly payment minus every
 * SaqlainiApp-head expense (an expense with no head counts as SaqlainiApp) -
 * the same rule as the "SaqlainiApp Available" box on the totals page.
 */
export async function getSaqlainiAvailable(supabase: any): Promise<number> {
    const [payments, expenses] = await Promise.all([
        fetchAllRows<{ amount: number }>(() => supabase.from('payment').select('amount').order('id')),
        fetchAllRows<{ amount: number; head: string | null }>(() => supabase.from('expenses').select('amount, head').order('id')),
    ]);
    if (payments.error || expenses.error) {
        throw new Error(payments.error || expenses.error || 'Could not read the totals.');
    }

    const totalPayment = payments.rows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const spent = expenses.rows
        .filter(e => e.head === 'SaqlainiApp' || e.head === null || e.head === '')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return totalPayment - spent;
}
