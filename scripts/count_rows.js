const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function count() {
    const { count: users, error: uErr } = await supabase.from('user_list').select('*', { count: 'exact', head: true });
    const { count: payments, error: pErr } = await supabase.from('payment').select('*', { count: 'exact', head: true });

    if (uErr) console.error('User count error:', uErr);
    if (pErr) console.error('Payment count error:', pErr);

    console.log(`User Count: ${users}`);
    console.log(`Payment Count: ${payments}`);
}

count();
