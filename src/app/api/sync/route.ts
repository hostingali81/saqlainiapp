import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSheetData, mapRowsToObjects } from '@/lib/sheets';
import { calculateBakayaStatus } from '@/lib/logic';

// --- CONFIGURATION ---
const MAPPINGS: Record<string, Record<string, string>> = {
    // Sheet Header -> DB Column Name
    'user_list': { 'id': 'id', 'name': 'name', 'fname': 'fname', 'phone': 'phone', 'frequency': 'frequency', 'hindi_name': 'hindi_name' },
    'payment': { 'payment_id': 'id', 'user_id': 'user_id', 'amount': 'amount', 'year': 'year', 'month': 'month' },
    // Exact match from user: ExpensesID, Timestamp, Category, Description, PaymentDate, Amount, Remarks, Head
    'expenses': { 'ExpensesID': 'id', 'Category': 'category', 'Description': 'details', 'PaymentDate': 'date', 'Amount': 'amount', 'Remarks': 'remarks', 'Head': 'head' },
    // Exact match from user: ChandaID, Timestamp, Name, Date, Amount, Remarks, NameHindi
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

        // Which tables to sync? (Order matters: child tables first to avoid FK violations)
        const syncOrder = ['payment', 'user_list', 'expenses', 'db_chanda'];
        const tablesToSync = target ? [target] : syncOrder.filter(t => SHEET_NAMES[t]);

        for (const table of tablesToSync) {
            const sheetName = SHEET_NAMES[table];
            if (!sheetName) continue;

            try {
                // 1. Fetch Data from Sheet (PULL)
                const rows = await getSheetData(sheetName);
                const sheetData = mapRowsToObjects(rows, MAPPINGS[table]);

                if (sheetData.length === 0) {
                    results[table] = "No data found";
                    continue;
                }

                // 2. Fetch Existing Data from DB for Comparison (Smart Diff)
                // Fetch all columns to compare content
                const { data: dbRows } = await supabase
                    .from(table)
                    .select('*')
                    .range(0, 20000); // 20k Limit

                const dbMap = new Map();
                if (dbRows) {
                    dbRows.forEach((row: any) => dbMap.set(String(row.id), row));
                }

                console.log(`[DEBUG] ${table}: Sheet Rows: ${sheetData.length}, DB Rows: ${dbMap.size}`);

                // 3. Identify Changes
                const rowsToUpsert: any[] = [];
                const idsToDelete: string[] = [];
                const usersToRecalculate = new Set<string>();

                // Check for Updates/Inserts
                for (const row of sheetData) {
                    const idStr = String(row.id);
                    const dbRow = dbMap.get(idStr);

                    if (!dbRow) {
                        // NEW ROW
                        rowsToUpsert.push(row);
                        if (table === 'payment') usersToRecalculate.add(String(row.user_id));
                    } else {
                        // EXISTING ROW - Compare Content
                        const isDifferent = Object.keys(row).some(key => {
                            let val1 = row[key];
                            let val2 = dbRow[key];

                            // START: Normalization
                            if (val1 === null || val1 === undefined) val1 = "";
                            if (val2 === null || val2 === undefined) val2 = "";

                            val1 = String(val1).trim();
                            val2 = String(val2).trim();
                            // END: Normalization

                            if (val1 !== val2) {
                                // Log the first few differences to avoid spamming
                                if (Math.random() < 0.05) { // Sample 5% of diffs
                                    console.log(`[DIFF] Table: ${table}, ID: ${row.id}, Key: ${key} | Sheet: "${val1}" vs DB: "${val2}"`);
                                }
                                return true;
                            }
                            return false;
                        });

                        if (isDifferent) {
                            rowsToUpsert.push(row);
                            if (table === 'payment') {
                                usersToRecalculate.add(String(row.user_id));
                                usersToRecalculate.add(String(dbRow.user_id));
                            }
                        }
                    }

                    // Mark as visited (remove from map so only deleted remain)
                    dbMap.delete(idStr);
                }

                // Remaining in dbMap are DELETED rows
                for (const [id, row] of dbMap.entries()) {
                    idsToDelete.push(id);
                    if (table === 'payment') usersToRecalculate.add(String(row.user_id));
                }

                // 4. Perform Updates (Batch)
                if (rowsToUpsert.length > 0) {
                    const { error: upsertError } = await supabase.from(table).upsert(rowsToUpsert);
                    if (upsertError) throw upsertError;
                }

                // 5. Perform Deletions (Child tables first to avoid FK violations)
                if (idsToDelete.length > 0) {
                    console.log(`[DELETE] ${table}: Removing ${idsToDelete.length} entries ->`, idsToDelete);
                    
                    // Special handling for user_list: delete payments first
                    if (table === 'user_list') {
                        const { error: paymentDelError } = await supabase
                            .from('payment')
                            .delete()
                            .in('user_id', idsToDelete);
                        if (paymentDelError) console.warn(`[WARN] Payment cleanup failed:`, paymentDelError);
                    }
                    
                    const { error: delError } = await supabase.from(table).delete().in('id', idsToDelete);
                    if (delError) {
                        console.error(`[ERROR] Delete failed for ${table}:`, delError);
                        throw delError;
                    }
                    console.log(`[SUCCESS] ${table}: Deleted ${idsToDelete.length} rows`);
                } else {
                    console.log(`[DEBUG] ${table}: No deletions detected.`);
                }

                // 6. TRIGGER: Recalculate Bakaya (Only for affected users)
                if (table === 'payment' && usersToRecalculate.size > 0) {
                    console.log(`Recalculating Bakaya for ${usersToRecalculate.size} users...`);
                    await recalculateBakayaBatch(supabase, usersToRecalculate);
                }

                results[table] = {
                    success: true,
                    totalInSheet: sheetData.length,
                    upserted: rowsToUpsert.length,
                    deleted: idsToDelete.length,
                    recalculated: usersToRecalculate.size
                };

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
async function recalculateBakayaBatch(supabase: any, userIds: Set<string>) {
    // Process in smaller chunks to avoid any potential limits
    const allUserIds = Array.from(userIds);
    const CHUNK_SIZE = 50;

    for (let i = 0; i < allUserIds.length; i += CHUNK_SIZE) {
        const chunk = allUserIds.slice(i, i + CHUNK_SIZE);

        // Parallelize within chunk for speed
        await Promise.all(chunk.map(async (userId) => {
            if (!userId) return;

            // Fetch User Info
            const { data: user } = await supabase.from('user_list').select('frequency').eq('id', userId).single();
            if (!user) return; // Skip if user deleted

            // Fetch Payment History
            const { data: payments } = await supabase.from('payment').select('year, month').eq('user_id', userId);

            const totalPaidMonths = new Set(payments?.map((p: any) => `${p.year}-${p.month}`)).size || 0;

            // Calculate Start Date
            let minYear = 9999, minMonth = 12;
            payments?.forEach((p: any) => {
                if (p.year < minYear) { minYear = p.year; minMonth = p.month; }
                else if (p.year === minYear && p.month < minMonth) { minMonth = p.month; }
            });

            // Calculate
            const newBakaya = calculateBakayaStatus(minYear, minMonth, totalPaidMonths, user.frequency);

            // Update
            await supabase.from('user_list').update({ bakaya_month: newBakaya }).eq('id', userId);
        }));
    }
}
