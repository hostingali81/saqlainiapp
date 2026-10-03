import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { CashClient } from '@/components/admin/CashClient';
import { readCashPosition, BANK_HOLDER, CashPosition } from '@/lib/cash';
import { getSaqlainiAvailable } from '@/lib/funds';

export const revalidate = 0;

export default async function CashPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    let position: CashPosition | null = null;
    let loadError = '';
    try {
        position = await readCashPosition();
    } catch (error: any) {
        console.error('Error reading cash position:', error);
        loadError = error?.message || 'Could not read the cash sheets.';
    }

    // Only used for the "bank account in total" line - the page works without it.
    let saqlainiAvailable: number | null = null;
    try {
        saqlainiAvailable = await getSaqlainiAvailable(supabase);
    } catch (error) {
        console.error('Error reading SaqlainiApp total:', error);
    }

    return (
        <main className="container max-w-lg mx-auto p-4 min-h-screen bg-background pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-primary font-serif">Chanda Cash</h1>
                <AdminNav />
            </div>

            {position ? (
                <CashClient position={position} saqlainiAvailable={saqlainiAvailable} bankHolder={BANK_HOLDER} />
            ) : (
                <div className="p-4 rounded-md bg-red-100 text-red-800 text-sm">
                    Cash ka hisaab nahi padh paaye: {loadError}
                </div>
            )}
        </main>
    );
}
