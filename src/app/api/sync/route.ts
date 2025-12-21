import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSheetData, mapRowsToObjects } from '@/lib/sheets';
import { calculateBakayaStatus } from '@/lib/logic';

// --- CONFIGURATION ---
const MAPPINGS: Record<string, Record<string, string>> = {
    'user_list': { 'id': 'id', 'name': 'name', 'fname': 'fname', 'phone': 'phone', 'frequency': 'frequency', 'hindi_name': 'hindi_name' },
    'payment': { 'payment_id': 'id', 'user_id': 'user_id', 'amount': 'amount', 'year': 'year', 'month': 'month' },
    'expenses': { 'ExpensesID': 'id', 'Category': 'category', 'Description': 'details', 'PaymentDate': 'date', 'Amount': 'amount', 'Remarks': 'remarks', 'Head': 'head' },
    'db_chanda': { 'ChandaID': 'id', 'Timestamp': 'timestamp', 'Name': 'name', 'NameHindi': 'hindi_name', 'Date': 'date', 'Amount': 'amount', 'Remarks': 'remarks' }
};

const SHEET_NAMES: Record<string, string> = {
    'user_list': 'DB',
    'payment': 'DB_PAYMENT',
    'expenses': 'DB_Expenses',
    'db_chanda': 'DB_Chanda'
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, target } = body; // target is optional (e.g., 'payment')

        const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || "my-secure-sync-token-123";
        if (token !== SECRET_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = await createClient();
        const results: Record<string, any> = {};

        // Which tables to sync?
        const tablesToSync = target ? [target] : Object.keys(SHEET_NAMES);

        for (const table of tablesToSync) {
            const sheetName = SHEET_NAMES[table];
            if (!sheetName) continue;

            try {
                // 1. Fetch Data from Sheet (PULL)
                const rows = await getSheetData(sheetName);
                const data = mapRowsToObjects(rows, MAPPINGS[table]);

                if (data.length === 0) {
                    results[table] = "No data found";
                    continue;
                }

                // 2. Upsert Data (Insert/Update)
                const { error: upsertError } = await supabase.from(table).upsert(data);
                if (upsertError) throw upsertError;

                // 3. Handle Deletions (Smart Diff)
                // Fetch all IDs from DB
                const { data: dbRows } = await supabase.from(table).select('id');
                const dbIds = new Set(dbRows?.map(r => r.id) || []);
                const sheetIds = new Set(data.map(r => String(r.id))); // Ensure string comparison

                const idsToDelete = [...dbIds].filter(id => !sheetIds.has(String(id)));

                if (idsToDelete.length > 0) {
                    // Delete & Return deleted rows for triggers
                    const { data: deleted, error: delError } = await supabase
                        .from(table)
                        .delete()
                        .in('id', idsToDelete)
                        .select();

                    if (delError) throw delError;

                    // TRIGGER: Payment Deletion -> Recalculate Bakaya
                    if (table === 'payment' && deleted) {
                        const userIds = new Set(deleted.map((p: any) => p.user_id));
                        await recalculateBakayaBatch(supabase, userIds);
                    }
                }

                // 4. TRIGGER: Payment Upsert -> Recalculate Bakaya
                // (We do this for ALL users involved in the upsert to be safe, or we can optimize if needed.
                // For now, recalculating involved users is safe.)
                if (table === 'payment') {
                    const userIds = new Set(data.map((p: any) => p.user_id));
                    await recalculateBakayaBatch(supabase, userIds);
                }

                results[table] = { success: true, count: data.length, deleted: idsToDelete.length };

            } catch (err: any) {
                console.error(`Error syncing ${table}:`, err);
                results[table] = { error: err.message };
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (err: any) {
        console.error('Sync Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// --- HELPER: Bakaya Recalculation ---
async function recalculateBakayaBatch(supabase: any, userIds: Set<any>) {
    for (const userId of userIds) {
        if (!userId) continue;

        // Fetch User Info
        const { data: user } = await supabase.from('user_list').select('frequency').eq('id', userId).single();
        if (!user) continue;

        // Fetch Payment History
        const { data: payments } = await supabase.from('payment').select('year, month').eq('user_id', userId);

        const totalPaidMonths = new Set(payments?.map((p: any) => `${p.year}-${p.month}`)).size || 0;

        // Calculate Start Date (Min Year/Month)
        let minYear = 9999, minMonth = 12;
        payments?.forEach((p: any) => {
            if (p.year < minYear) { minYear = p.year; minMonth = p.month; }
            else if (p.year === minYear && p.month < minMonth) { minMonth = p.month; }
        });

        // Use Logic Lib
        const newBakaya = calculateBakayaStatus(minYear, minMonth, totalPaidMonths, user.frequency);

        // Update DB
        await supabase.from('user_list').update({ bakaya_month: newBakaya }).eq('id', userId);
    }
}
