'use server';

import { createClient } from '@/lib/supabase/server';
import { Expense, ChandaEntry } from '@/types';
import { fetchAllRows } from '@/lib/fetch-all';
import { formatDMY } from '@/lib/dates';

/** Treat the user's text literally inside an ILIKE pattern. */
function escapeLike(text: string) {
    return text.replace(/[\\%_]/g, c => `\\${c}`);
}

/**
 * Category + search filters shared by the list, the stats and the PDF, so
 * all three always describe the same set of expenses.
 */
function filterExpenses<Q extends { eq: (col: string, v: string) => Q; ilike: (col: string, v: string) => Q }>(
    query: Q,
    category?: string,
    search?: string
): Q {
    if (category && category !== 'All') {
        query = query.eq('category', category); // Column 'category' lowercase
    }
    const term = search?.trim();
    if (term) {
        query = query.ilike('details', `%${escapeLike(term)}%`);
    }
    return query;
}

function formatExpense(item: any): Expense {
    return {
        ...item,
        // Map lowercase DB columns to the Type 'Expense' (PascalCase fields)
        ExpenseID: item.id,
        Category: item.category,
        Details: item.details, // Fixed: Map to 'Details' (was Description)
        // DD/MM/YYYY like every other date in the app. Straight from the ISO
        // text - `new Date()` would shift a date-only value by timezone.
        PaymentDate: formatDMY(item.date),
        Amount: item.amount,
        Remarks: item.remarks,
        Head: item.head || 'N/A'
    };
}

export async function getExpenses(page: number = 1, limit: number = 50, category?: string, search?: string) {
    const supabase = await createClient();

    // Search runs in the database. It used to filter only the 50 rows of the
    // current page in the browser, so anything on another page was "not found".
    const query = filterExpenses(
        supabase
            .from('expenses') // dataset is in 'expenses' not 'Expenses'
            .select('*', { count: 'exact' })
            .order('date', { ascending: false }) // Column is 'date' in lowercase
            .order('id', { ascending: false }),
        category,
        search
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
        console.error('Error fetching expenses:', error);
        return { data: [], total: 0 };
    }

    return { data: (data || []).map(formatExpense), total: count || 0 };
}

/**
 * Every matching expense, for the PDF. The export used to ask getExpenses for
 * 10000 rows, but Supabase returns at most 1000 per request - so the PDF was
 * cut short while its header still showed the full transaction count.
 */
export async function getAllExpenses(category?: string, search?: string) {
    const supabase = await createClient();

    const { rows, error } = await fetchAllRows<any>(() => filterExpenses(
        supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('id', { ascending: false }),
        category,
        search
    ));

    if (error) {
        console.error('Error fetching expenses for export:', error);
        return { data: [] as Expense[], error };
    }

    return { data: rows.map(formatExpense), error: null };
}

export interface ChandaGroup {
    id: string; // unique key (name)
    name: string;
    totalAmount: number;
    count: number;
    latestDate: string;
    latestRemarks: string;
    donations: ChandaEntry[];
}

export interface ChandaStats {
    totalAmount: number;
    totalDonations: number;
    avgAmount: number;
    maxAmount: number;
}

export async function getChandaEntries(search: string = '') {
    const supabase = await createClient();

    // Use database function for better performance
    const { data, error } = await supabase.rpc('get_chanda_groups', {
        search_term: search
    });

    if (error) {
        console.error('Error fetching chanda entries:', error);
        // Fallback to old method if function doesn't exist yet
        return await getChandaEntriesLegacy(search);
    }

    // Calculate stats from grouped data
    // Dates arrive as ISO; they are only ever displayed, so show DD/MM/YYYY.
    const groups: ChandaGroup[] = (data || []).map((item: any) => ({
        id: item.display_name,
        name: item.display_name,
        totalAmount: Number(item.total_amount || 0),
        count: Number(item.donation_count || 0),
        latestDate: formatDMY(item.latest_date),
        latestRemarks: item.latest_remarks || '',
        donations: (item.donations || []).map((d: any) => ({ ...d, Date: formatDMY(d.Date) }))
    }));

    const totalAmount = groups.reduce((sum: number, g: ChandaGroup) => sum + g.totalAmount, 0);
    const totalDonations = groups.reduce((sum: number, g: ChandaGroup) => sum + g.count, 0);
    const avgAmount = totalDonations > 0 ? totalAmount / totalDonations : 0;
    const maxAmount = groups.reduce((max: number, g: ChandaGroup) => Math.max(max, g.totalAmount), 0);

    return {
        groups,
        stats: { totalAmount, totalDonations, avgAmount, maxAmount }
    };
}

// Legacy fallback method
async function getChandaEntriesLegacy(search: string = '') {
    const supabase = await createClient();

    // Paged for the same reason: the totals below are summed over every row.
    const { rows: rawData, error } = await fetchAllRows<any>(() => {
        let query = supabase
            .from('db_chanda')
            .select('*')
            .order('id', { ascending: false });

        // The text goes into a PostgREST filter string, where `,` `(` `)` and
        // quotes are syntax - left in, they could break or extend the filter.
        const term = search.replace(/[,()"\\]/g, ' ').trim();
        if (term) {
            query = query.or(`name.ilike.%${term}%,hindi_name.ilike.%${term}%,remarks.ilike.%${term}%`);
        }
        return query;
    });

    if (error) {
        console.error('Error fetching chanda entries:', error);
        return { groups: [], stats: { totalAmount: 0, totalDonations: 0, avgAmount: 0, maxAmount: 0 } };
    }

    const entries = rawData.map((item: any) => ({
        id: item.id,
        ChandaID: item.id,
        Name: item.name,
        NameHindi: item.hindi_name,
        hindi_name: item.hindi_name,
        Date: formatDMY(item.date),
        Amount: item.amount,
        Remarks: item.remarks
    })) as ChandaEntry[];

    const totalAmount = entries.reduce((sum, item) => sum + (item.Amount || 0), 0);
    const totalDonations = entries.length;
    const avgAmount = totalDonations > 0 ? totalAmount / totalDonations : 0;
    const maxAmount = entries.reduce((max, item) => Math.max(max, item.Amount || 0), 0);

    const groups: { [key: string]: ChandaGroup } = {};

    entries.forEach(entry => {
        const displayName = entry.NameHindi || entry.Name || 'N/A';
        const date = entry.Date || 'N/A';

        if (!groups[displayName]) {
            groups[displayName] = {
                id: displayName,
                name: displayName,
                totalAmount: 0,
                count: 0,
                latestDate: date,
                latestRemarks: entry.Remarks || '',
                donations: []
            };
        }

        groups[displayName].totalAmount += (entry.Amount || 0);
        groups[displayName].count += 1;
        groups[displayName].donations.push(entry);
    });

    return {
        groups: Object.values(groups),
        stats: { totalAmount, totalDonations, avgAmount, maxAmount }
    };
}

export async function getExpensePageStats(category?: string, search?: string) {
    const supabase = await createClient();

    // A plain select stops at 1000 rows, so these headline numbers quietly
    // went short once the expenses table grew past that.
    const { rows: expenses, error } = await fetchAllRows<{ amount: number; category: string | null }>(() =>
        filterExpenses(supabase.from('expenses').select('amount, category').order('id'), category, search)
    );

    if (error) {
        console.error('Error fetching expense stats:', error);
    }

    const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalTransactions = expenses.length;
    const totalCategories = new Set(expenses.map(e => e.category).filter(Boolean)).size;

    return { totalAmount, totalTransactions, totalCategories };
}

export async function getCategories() {
    const supabase = await createClient();

    // OPTIMIZED: Use database function to get distinct categories instantly
    const { data, error } = await supabase.rpc('get_unique_categories');

    if (!error && data && data.length > 0) {
        // RPC returns array of objects: [{ category: 'Food' }, { category: 'Travel' }]
        // We need to map it to a string array
        return data.map((item: any) => item.category).filter(Boolean);
    }

    if (error) {
        // Silent fail to console, fallback to old method
        console.warn('get_unique_categories RPC failed (function might not exist yet), falling back to raw query.', error.message);
    }

    // FALLBACK: Old method (fetches all expenses)
    // Useful if the user hasn't run the new SQL migration yet.
    // Paged - categories that only appear after the first 1000 rows were missing.
    const { rows: rawData, error: rawError } = await fetchAllRows<{ category: string | null }>(
        () => supabase.from('expenses').select('category').order('id')
    );

    if (rawError) {
        console.error('Error fetching categories:', rawError);
        return [];
    }

    // Extract unique non-null categories
    const categories = Array.from(new Set(rawData.map(item => item.category).filter(Boolean)));
    return categories.sort();
}
