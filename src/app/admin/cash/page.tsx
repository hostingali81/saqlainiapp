import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { Notice } from '@/components/admin/ui';
import { CashClient } from '@/components/admin/CashClient';
import { readCashPosition, BANK_HOLDER, CashPosition } from '@/lib/cash';
import { getSaqlainiAvailable } from '@/lib/funds';

export const revalidate = 0;

export default async function CashPage() {
    const supabase = await createClient();

    // The admin check, the cash sheets and the SaqlainiApp total all load
    // together instead of one after another. Nothing is rendered until the
    // check has passed.
    const [{ data: { user } }, positionResult, availableResult] = await Promise.all([
        supabase.auth.getUser(),
        readCashPosition().then(
            (position): { position: CashPosition | null; loadError: string } => ({ position, loadError: '' }),
            (error: any) => {
                console.error('Error reading cash position:', error);
                return { position: null, loadError: error?.message || 'Could not read the cash sheets.' };
            }
        ),
        // Only used for the "bank account in total" line - the page works without it.
        getSaqlainiAvailable(supabase).catch((error): number | null => {
            console.error('Error reading SaqlainiApp total:', error);
            return null;
        }),
    ]);

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    const { position, loadError } = positionResult;
    const saqlainiAvailable = availableResult;

    return (
        <AdminShell title="Chanda Cash" subtitle="Chanda ka paisa kiske paas hai - hisaab, handover aur adjustment.">
            {position ? (
                <CashClient position={position} saqlainiAvailable={saqlainiAvailable} bankHolder={BANK_HOLDER} />
            ) : (
                <Notice tone="error">Cash ka hisaab nahi padh paaye: {loadError}</Notice>
            )}
        </AdminShell>
    );
}
