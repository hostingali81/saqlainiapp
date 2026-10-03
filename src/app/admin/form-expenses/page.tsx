import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { FormExpensesClient } from '@/components/admin/FormExpensesClient';
import { getSheetData } from '@/lib/sheets';
import { readHolders } from '@/lib/cash';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function FormExpensesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    const data = await getSheetData('FormExpenses!A:G');
    const names = data && data.length > 1 
        ? data.slice(1).map((row: any) => row[1] || '').filter((name: string) => name)
        : [];

    const uniqueNames = Array.from(new Set(names));

    // Who can hold the Chanda money. Without the CashHolders tab the form
    // simply works as before (no holder field).
    const holders = await readHolders().catch(() => ({ names: [] as string[], openingAsOf: null }));

    return <FormExpensesClient existingNames={uniqueNames} holders={holders.names} openingAsOf={holders.openingAsOf} />;
}
