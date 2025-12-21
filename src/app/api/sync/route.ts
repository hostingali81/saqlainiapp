import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to recalculate bakaya for a set of users
async function recalculateBakayaForUsers(supabase: any, userIds: Set<any>) {
    for (const userId of userIds) {
        if (!userId) continue;

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

        if (user && payments) {
            // Calculate Total Paid Months
            const uniqueMonths = new Set(payments.map((p: any) => `${p.year}-${p.month}`));
            const totalPaidMonths = uniqueMonths.size;

            // Determine First Payment Date Dynamically
            let minYear = 9999;
            let minMonth = 12;

            payments.forEach((p: any) => {
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { table, data, token, action } = body;

        // Simple security check (Using Environment Variable)
        const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || "my-secure-sync-token-123";

        if (token !== SECRET_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!table || !data) {
            return NextResponse.json({ error: 'Missing table or data' }, { status: 400 });
        }

        const supabase = await createClient();

        // Valid tables allowed to be synced
        const validTables = ['user_list', 'payment', 'db_chanda', 'expenses'];
        if (!validTables.includes(table)) {
            return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
        }

        // --- HANDLE UPSERT (INSERT/UPDATE) ---
        if (!action || action === 'upsert') {
            const { error } = await supabase
                .from(table)
                .upsert(data);

            if (error) {
                console.error('Supabase Sync Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            // TRIGGER: Recalculate Bakaya if Payment Updated
            if (table === 'payment') {
                const paymentsToProcess = Array.isArray(data) ? data : [data];
                const userIds = new Set(paymentsToProcess.map((p: any) => p.user_id));
                await recalculateBakayaForUsers(supabase, userIds);
            }
        }

        // --- HANDLE DELETIONS (SYNC CLEANUP) ---
        else if (action === 'sync_deletions') {
            const activeIds = data;

            if (!Array.isArray(activeIds)) {
                return NextResponse.json({ error: 'Data must be an array of IDs' }, { status: 400 });
            }

            // Safety check
            if (!validTables.includes(table)) {
                return NextResponse.json({ error: 'Deletion not allowed' }, { status: 403 });
            }

            // Delete rows NOT in the list AND return them
            const { data: deletedRows, error: deleteError } = await supabase
                .from(table)
                .delete()
                .not('id', 'in', `(${activeIds.join(',')})`)
                .select(); // IMPORTANT: Return deleted rows to handle triggers

            if (deleteError) {
                console.error('Delete Error:', deleteError);
                return NextResponse.json({ error: deleteError.message }, { status: 500 });
            }

            // TRIGGER: Recalculate Bakaya if Payment Deleted
            if (table === 'payment' && deletedRows && deletedRows.length > 0) {
                const userIds = new Set(deletedRows.map((p: any) => p.user_id));
                await recalculateBakayaForUsers(supabase, userIds);
            }

            return NextResponse.json({ success: true, message: `Synced deletions. Removed ${deletedRows?.length || 0} rows.` });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
