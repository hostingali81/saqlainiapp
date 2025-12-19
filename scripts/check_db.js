const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://obamcygxpzazfdyvyphz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYW1jeWd4cHphemZkeXZ5cGh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNDMzMCwiZXhwIjoyMDcyMjAwMzMwfQ.JCDDAAPA-4oX-YrRmZjm5mEhJSsfRN76juacARi_Z9c';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkCounts() {
    console.log('🔍 Checking Row Counts in Supabase...');

    // Check lowercase
    const { count: expCount, error: expError } = await supabase.from('expenses').select('*', { count: 'exact', head: true });
    console.log(`expenses (lowercase): ${expCount} (Error: ${expError?.message})`);

    const { count: ExpCount, error: ExpError } = await supabase.from('Expenses').select('*', { count: 'exact', head: true });
    console.log(`Expenses (Capitalized): ${ExpCount} (Error: ${ExpError?.message})`);

    const { count: chandaCount, error: chandaError } = await supabase.from('db_chanda').select('*', { count: 'exact', head: true });
    console.log(`db_chanda (lowercase): ${chandaCount} (Error: ${chandaError?.message})`);

    const { count: ChandaCount, error: ChandaError } = await supabase.from('DB_Chanda').select('*', { count: 'exact', head: true });
    console.log(`DB_Chanda (Capitalized): ${ChandaCount} (Error: ${ChandaError?.message})`);

    // Check a sample row from expenses to see columns
    const { data: sampleExp } = await supabase.from('expenses').select('*').limit(1);
    if (sampleExp && sampleExp.length > 0) {
        console.log('Sample Expense Row:', sampleExp[0]);
    }
}

checkCounts().catch(console.error);
