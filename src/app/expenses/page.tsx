import { ExpensesForm } from '@/components/expenses/ExpensesForm';
import { createClient } from '@/lib/supabase/server';

export default async function ExpensesPage() {
    return (
        <ExpensesForm />
    );
}
