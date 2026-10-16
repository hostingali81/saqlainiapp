import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { FormChandaClient } from '@/components/admin/FormChandaClient';
import { getSheetData } from '@/lib/sheets';
import { readHolders } from '@/lib/cash';
import { AdminShell } from '@/components/admin/AdminShell';
import { settle, unwrap } from '@/lib/settle';
import { getFormChandaEntries } from '@/app/actions/formChanda';

export default async function FormChandaPage() {
    const supabase = await createClient();

    // Admin check and both sheet reads run together instead of one after
    // another. Nothing is shown (or thrown) until the check has passed.
    const [{ data: { user } }, sheet, holders, initial] = await Promise.all([
        supabase.auth.getUser(),
        settle(getSheetData('FormChanda!A:F')),
        // Who can hold the money. Without the CashHolders tab the form simply
        // works as before (no holder field).
        readHolders().catch(() => ({ names: [] as string[], openingAsOf: null })),
        // The list arrives with the page instead of in a second request once
        // the page has loaded (it checks admin access itself).
        getFormChandaEntries(1, 50),
    ]);

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    const data = unwrap(sheet);
    const names = data && data.length > 1 
        ? data.slice(1).map((row: any) => ({
            name: row[1] || '',
            nameHindi: row[2] || ''
          })).filter((item: any) => item.name)
        : [];

    const uniqueNames = Array.from(
        new Map(names.map((item: any) => [item.name, item])).values()
    );

    return (
        <AdminShell title="Chanda Entry" subtitle="Naya chanda darj karein, purani entries edit ya delete karein." width="wide">
            <FormChandaClient existingNames={uniqueNames} holders={holders.names} openingAsOf={holders.openingAsOf} initialEntries={initial.entries} />
        </AdminShell>
    );
}

