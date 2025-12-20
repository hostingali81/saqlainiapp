import { ChandaForm } from '@/components/chanda/ChandaForm';
import { createClient } from '@/lib/supabase/server';

export default async function ChandaPage() {
    return (
        <ChandaForm />
    );
}
