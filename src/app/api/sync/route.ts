import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { table, data, token } = body;

        // Simple security check (you should ideally use an environment variable for this)
        // Simple security check (Using Environment Variable)
        const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || "fallback-token-change-me";

        if (token !== SECRET_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!table || !data) {
            return NextResponse.json({ error: 'Missing table or data' }, { status: 400 });
        }

        const supabase = await createClient();

        // Valid tables allowed to be synced
        const validTables = ['user_list', 'payment', 'DB_Chanda', 'Expenses'];
        if (!validTables.includes(table)) {
            return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
        }



        // Perform Upsert (Insert or Update if ID exists)
        const { error } = await supabase
            .from(table)
            .upsert(data);

        if (error) {
            console.error('Supabase Sync Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // TRIGGER: If Payment is updated, we MUST recalculate 'bakaya_month' for that user
        // This ensures the DB field stays in sync with the Cronjob logic
        // TRIGGER: If Payment is updated, we MUST recalculate 'bakaya_month' for that user
        if (table === 'payment') {
            const userId = data.user_id;

            if (userId) {
                // 1. Fetch User (only frequency needed now)
                const { data: user } = await supabase
                    .from('user_list')
                    .select('frequency')
                    .eq('id', userId)
                    .single();

                // 2. Fetch All Payments for this user to determine history & Start Date
                const { data: payments } = await supabase
                    .from('payment')
                    .select('year, month')
                    .eq('user_id', userId);

                if (user && payments && payments.length > 0) {
                    // Calculate Total Paid Months
                    const uniqueMonths = new Set(payments.map(p => `${p.year}-${p.month}`));
                    const totalPaidMonths = uniqueMonths.size;

                    // Determine First Payment Date Dynamically (Logic from profile.php)
                    // Find min year, then min month in that year
                    let minYear = 9999;
                    let minMonth = 12;

                    payments.forEach(p => {
                        if (p.year < minYear) {
                            minYear = p.year;
                            minMonth = p.month;
                        } else if (p.year === minYear) {
                            if (p.month < minMonth) {
                                minMonth = p.month;
                            }
                        }
                    });

                    // 3. Calculate New Bakaya
                    const { calculateBakayaStatus } = await import('@/lib/logic');
                    const newBakaya = calculateBakayaStatus(
                        minYear,
                        minMonth,
                        totalPaidMonths,
                        user.frequency
                    );



                    // 4. Update User Record
                    await supabase
                        .from('user_list')
                        .update({ bakaya_month: newBakaya })
                        .eq('id', userId);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
