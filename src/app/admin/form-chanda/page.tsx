import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin-access';
import { redirect } from 'next/navigation';
import { FormChandaClient } from '@/components/admin/FormChandaClient';
import { getSheetData } from '@/lib/sheets';
import { readHolders } from '@/lib/cash';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function FormChandaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdminUser(user)) {
        redirect('/admin/login');
    }

    const data = await getSheetData('FormChanda!A:F');
    const names = data && data.length > 1 
        ? data.slice(1).map((row: any) => ({
            name: row[1] || '',
            nameHindi: row[2] || ''
          })).filter((item: any) => item.name)
        : [];

    const uniqueNames = Array.from(
        new Map(names.map((item: any) => [item.name, item])).values()
    );

    // Who can hold the money. Without the CashHolders tab the form simply
    // works as before (no holder field).
    const holders = await readHolders().catch(() => ({ names: [] as string[], openingAsOf: null }));

    return <FormChandaClient existingNames={uniqueNames} holders={holders.names} openingAsOf={holders.openingAsOf} />;
}

