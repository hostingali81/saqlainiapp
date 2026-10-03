import { createAdminClient } from '@/lib/supabase/admin';
import { getSheetData, mapRowsToObjects, findIncompleteRows, normalizeCell } from '@/lib/sheets';
import { calculateBakayaStatus, countTrackedPaidMonths, findFirstPaymentMonth } from '@/lib/logic';
import { fetchAllRows } from '@/lib/fetch-all';

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

/**
 * Database columns that hold dates. The sheet is read raw (serial numbers),
 * so these are converted to ISO here. They used to be sent as the sheet's
 * display text ("7/10/2026") for Postgres to parse as month-first - which
 * would silently swap day and month the moment the sheet showed DD/MM/YYYY.
 */
const DATE_COLUMNS: Record<string, Record<string, 'date' | 'datetime'>> = {
    'expenses': { 'date': 'date' },
    'db_chanda': { 'date': 'date', 'timestamp': 'datetime' },
};

/** Columns a row cannot be synced without (besides its id). */
const REQUIRED_COLUMNS: Record<string, string[]> = {
    // user_id comes from a VLOOKUP on the member's name - blank means the
    // payment would be stored against nobody.
    'payment': ['user_id'],
};

const SHEET_NAMES: Record<string, string> = {
    'user_list': 'DB',
    'payment': 'DB_PAYMENT',
    'expenses': 'DB_Expenses',
    'db_chanda': 'DB_Chanda'
};

/** Targets a caller may ask for; anything else is rejected up front. */
export const SYNC_TARGETS = ['all', 'user_list', 'payment', 'expenses', 'db_chanda'] as const;

export function isSyncTarget(value: unknown): value is typeof SYNC_TARGETS[number] {
    return typeof value === 'string' && (SYNC_TARGETS as readonly string[]).includes(value);
}

/**
 * Tables whose sync did not go through. performSync records a failure per
 * table and carries on, so a run can "finish" with every table failed - the
 * callers used to report that as a success.
 */
export function syncErrors(results: Record<string, any>): string[] {
    return Object.entries(results)
        .filter(([, r]) => r && typeof r === 'object' && 'error' in r)
        .map(([table, r]) => `${table}: ${r.error}`);
}

/**
 * Bring members + payments in the database in line with the sheet right away,
 * after the app itself changed FormResponses. Returns what went wrong, or null.
 */
export async function syncPaymentsFromSheet(): Promise<string | null> {
    try {
        const errors = syncErrors(await performSync('payment'));
        return errors.length > 0 ? errors.join(' | ') : null;
    } catch (err: any) {
        return err?.message || 'sync failed';
    }
}

export async function performSync(target?: string) {
    const supabase = createAdminClient();
    const results: Record<string, any> = {};

    // Parent before child: a new member and their first payment usually arrive
    // in the same sync, and `payment` used to go first - so the new member's
    // payment broke the foreign key and failed the whole payment sync.
    // Deletions stay safe: removing a member deletes their payments first (below).
    const syncOrder = ['user_list', 'payment', 'expenses', 'db_chanda'];
    let tablesToSync: string[];

    if (target && target !== 'all') {
        // Members and payments are linked, so either target syncs both.
        if (target === 'user_list' || target === 'payment') {
            tablesToSync = ['user_list', 'payment'];
        } else {
            tablesToSync = [target];
        }
    } else {
        tablesToSync = syncOrder.filter(t => SHEET_NAMES[t]);
    }

    console.log(`[SYNC] Target: ${target || 'ALL'}, Tables: ${tablesToSync.join(', ')}`);

    // Member ids that vanished from the sheet - removed after payments (step 5).
    let memberIdsToDelete: string[] = [];

    for (const table of tablesToSync) {
        const sheetName = SHEET_NAMES[table];
        if (!sheetName) continue;

        try {
            // 1. Fetch Data from Sheet (PULL). Raw values, so nothing depends on
            // how the sheet happens to format a cell.
            const rows = await getSheetData(sheetName, { raw: true });

            // Rows with data but no id (or no member) would be dropped below and
            // their database copies deleted. Refuse instead of losing them.
            const incomplete = findIncompleteRows(rows, MAPPINGS[table], REQUIRED_COLUMNS[table]);
            if (incomplete.length > 0) {
                results[table] = {
                    error: `${incomplete.length} row(s) in sheet "${sheetName}" have data but no ${['id', ...(REQUIRED_COLUMNS[table] || [])].join('/')} (first at row ${incomplete[0]}). Nothing was changed. Fill the id formulas further down the sheet, or fix the name so it matches the DB sheet.`
                };
                continue;
            }

            const sheetData = mapRowsToObjects(rows, MAPPINGS[table]);

            // Dates arrive as serial numbers - turn them into ISO for Postgres.
            for (const [col, kind] of Object.entries(DATE_COLUMNS[table] || {})) {
                for (const row of sheetData) {
                    if (row[col] !== undefined) row[col] = normalizeCell(row[col], kind);
                }
            }

            if (sheetData.length === 0) {
                // Nothing is changed (an empty read must never wipe the table),
                // but it is almost always a renamed sheet or header - not
                // something to report as a successful sync.
                results[table] = { error: `No rows read from sheet "${sheetName}" - nothing was changed. Check the sheet name and the id column header.` };
                continue;
            }

            // 2. Fetch Existing Data from DB for Comparison (Smart Diff)
            // Fetch all columns to compare content using pagination to bypass API limits
            const dbMap = new Map();
            let hasMore = true;
            let from = 0;
            const BATCH_SIZE = 1000;

            while (hasMore) {
                // Ordered: offset paging without ORDER BY is not guaranteed to
                // be stable, and a row missed here would be treated as new.
                const { data: batch, error } = await supabase
                    .from(table)
                    .select('*')
                    .order('id', { ascending: true })
                    .range(from, from + BATCH_SIZE - 1);

                if (error) throw error;

                if (batch && batch.length > 0) {
                    batch.forEach((row: any) => dbMap.set(String(row.id), row));
                    from += BATCH_SIZE;
                    // If we got fewer rows than requested, we're done
                    if (batch.length < BATCH_SIZE) hasMore = false;
                } else {
                    hasMore = false;
                }
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

            // 5. Perform Deletions.
            if (table === 'user_list') {
                // Members are removed only AFTER payments have synced (below the
                // loop). Member ids are positions in the sheet, so a vanished id
                // can just mean everyone moved up by one: the payment step
                // re-points those payments, and deleting the member (with their
                // payments) here first wiped payments that belong to someone.
                memberIdsToDelete = idsToDelete;
            } else if (idsToDelete.length > 0) {
                console.log(`[DELETE] ${table}: Removing ${idsToDelete.length} entries ->`, idsToDelete);
                const { error: delError } = await supabase.from(table).delete().in('id', idsToDelete);
                if (delError) {
                    console.error(`[ERROR] Delete failed for ${table}:`, delError);
                    throw delError;
                }
                console.log(`[SUCCESS] ${table}: Deleted ${idsToDelete.length} rows`);
            } else {
                console.log(`[DEBUG] ${table}: No deletions detected.`);
            }

            results[table] = {
                success: true,
                totalInSheet: sheetData.length,
                upserted: rowsToUpsert.length,
                // Member removals happen after the loop and fill this in there.
                deleted: table === 'user_list' ? 0 : idsToDelete.length,
                recalculated: usersToRecalculate.size
            };

        } catch (err: any) {
            console.error(`Error syncing ${table}:`, err);
            results[table] = { error: err.message };
        }
    }

    // Deferred member removals (see step 5). user_list always syncs together
    // with payment, so only go ahead once payments are known to be in place;
    // otherwise keep the members for now and say so.
    if (memberIdsToDelete.length > 0 && results.user_list && !('error' in results.user_list)) {
        if (results.payment && !('error' in results.payment)) {
            try {
                console.log(`[DELETE] user_list: Removing ${memberIdsToDelete.length} entries ->`, memberIdsToDelete);
                // Any payment still pointing at a removed member is gone from
                // the sheet too (the payment step just matched it) - FK order.
                const { error: paymentDelError } = await supabase.from('payment').delete().in('user_id', memberIdsToDelete);
                if (paymentDelError) throw paymentDelError;
                const { error: delError } = await supabase.from('user_list').delete().in('id', memberIdsToDelete);
                if (delError) throw delError;
                results.user_list.deleted = memberIdsToDelete.length;
            } catch (err: any) {
                console.error('[ERROR] Delete failed for user_list:', err);
                results.user_list = { error: `Members could not be removed: ${err.message}` };
            }
        } else {
            results.user_list = { error: `${memberIdsToDelete.length} member(s) were not removed because the payment sync did not succeed. Run Sync again.` };
        }
    }

    // Recalculate Bakaya for ALL users once both members and payments are in.
    // This used to run inside the payment step - before user_list had synced -
    // so new members and changed frequencies were only picked up a sync later.
    const syncedMembersOrPayments = ['user_list', 'payment'].some(
        t => tablesToSync.includes(t) && results[t] && !('error' in results[t])
    );
    if (syncedMembersOrPayments) {
        try {
            console.log(`Recalculating Bakaya for ALL users...`);
            const bakaya = await recalculateBakayaForAllUsers(supabase);
            results.bakaya = bakaya.failed > 0
                ? { error: `${bakaya.failed} member(s) could not be updated (${bakaya.updated} updated).` }
                : { success: true, updated: bakaya.updated };
        } catch (err: any) {
            console.error('Bakaya recalculation failed:', err);
            results.bakaya = { error: err.message };
        }
    }

    return results;
}

// --- HELPER: Bakaya Recalculation for ALL Users ---
async function recalculateBakayaForAllUsers(supabase: any): Promise<{ updated: number; failed: number }> {
    // Both reads are paged (a plain select stops at 1000 rows) and payments are
    // read once for everyone, instead of one query per member.
    const { rows: allUsers, error: usersError } = await fetchAllRows<{ id: number; frequency: string; bakaya_month: number | null }>(
        () => supabase.from('user_list').select('id, frequency, bakaya_month').order('id', { ascending: true })
    );
    if (usersError) throw new Error(`Could not read members: ${usersError}`);

    const { rows: allPayments, error: paymentsError } = await fetchAllRows<{ id: number; user_id: number; year: number; month: number }>(
        () => supabase.from('payment').select('id, user_id, year, month').order('id', { ascending: true })
    );
    if (paymentsError) throw new Error(`Could not read payments: ${paymentsError}`);

    const paymentsByUser = new Map<string, Array<{ year: number; month: number }>>();
    for (const p of allPayments) {
        const key = String(p.user_id);
        const list = paymentsByUser.get(key);
        if (list) list.push(p);
        else paymentsByUser.set(key, [p]);
    }

    console.log(`Processing ${allUsers.length} users for bakaya recalculation...`);

    let updated = 0;
    let failed = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < allUsers.length; i += CHUNK_SIZE) {
        const chunk = allUsers.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async user => {
            const payments = paymentsByUser.get(String(user.id)) || [];

            // Same window as calculateBakayaStatus, otherwise pre-cutoff payments cancel
            // out months that were never counted and dues come out too low.
            const totalPaidMonths = countTrackedPaidMonths(payments);
            const firstPayment = findFirstPaymentMonth(payments);

            const newBakaya = calculateBakayaStatus(
                firstPayment?.year,
                firstPayment?.month,
                totalPaidMonths,
                user.frequency
            );

            // Only write what actually changed.
            if (user.bakaya_month === newBakaya) return;

            // These errors used to be ignored, leaving stale due counts behind
            // a sync that reported success.
            const { error } = await supabase.from('user_list').update({ bakaya_month: newBakaya }).eq('id', user.id);
            if (error) {
                failed++;
                console.error(`Bakaya update failed for user ${user.id}:`, error);
            } else {
                updated++;
            }
        }));
    }

    console.log(`Bakaya recalculation completed: ${updated} updated, ${failed} failed.`);
    return { updated, failed };
}
