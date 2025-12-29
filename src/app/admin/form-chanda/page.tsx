import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FormChandaClient } from '@/components/admin/FormChandaClient';
import { getSheetData } from '@/lib/sheets';

export default async function FormChandaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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

    return <FormChandaClient existingNames={uniqueNames} />;
}

