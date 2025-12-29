import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FormExpensesClient } from '@/components/admin/FormExpensesClient';
import { getSheetData } from '@/lib/sheets';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function FormExpensesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/admin/login');
    }

    const data = await getSheetData('FormExpenses!A:G');
    const names = data && data.length > 1 
        ? data.slice(1).map((row: any) => row[1] || '').filter((name: string) => name)
        : [];

    const uniqueNames = Array.from(new Set(names));

    return <FormExpensesClient existingNames={uniqueNames} />;
}
