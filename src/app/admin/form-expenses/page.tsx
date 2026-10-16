import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { FormExpensesClient } from '@/components/admin/FormExpensesClient';
import { getSheetData } from '@/lib/sheets';
import { readHolders } from '@/lib/cash';
import { AdminShell } from '@/components/admin/AdminShell';
import { settle, unwrap } from '@/lib/settle';
import { getFormExpenseEntries } from '@/app/actions/formExpenses';

export default async function FormExpensesPage() {
    const supabase = await createClient();

    // Admin check and both sheet reads run together instead of one after
    // another. Nothing is shown (or thrown) until the check has passed.
    const [{ data: { user } }, sheet, holders, initial] = await Promise.all([
        supabase.auth.getUser(),
        settle(getSheetData('FormExpenses!A:G')),
        // Who can hold the Chanda money. Without the CashHolders tab the form
        // simply works as before (no holder field).
        readHolders().catch(() => ({ names: [] as string[], openingAsOf: null })),
        // The list arrives with the page instead of in a second request once
        // the page has loaded (it checks admin access itself).
        getFormExpenseEntries(1, 50),
    ]);

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    const data = unwrap(sheet);
    const names = data && data.length > 1 
        ? data.slice(1).map((row: any) => row[1] || '').filter((name: string) => name)
        : [];

    const uniqueNames = Array.from(new Set(names));

    return (
        <AdminShell title="Expenses Entry" subtitle="Naya kharch darj karein, purani entries edit ya delete karein." width="wide">
            <FormExpensesClient existingNames={uniqueNames} holders={holders.names} openingAsOf={holders.openingAsOf} initialEntries={initial.entries} />
        </AdminShell>
    );
}
