'use server';

import { createClient } from '@/lib/supabase/server';
import { Expense, ChandaEntry } from '@/types';

export async function getExpenses(page: number = 1, limit: number = 50, category?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('expenses') // dataset is in 'expenses' not 'Expenses'
        .select('*', { count: 'exact' })
        .order('date', { ascending: false }); // Column is 'date' in lowercase

    if (category && category !== 'All') {
        query = query.eq('category', category); // Column 'category' lowercase
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
        console.error('Error fetching expenses:', error);
        return { data: [], total: 0 };
    }

    // Format date similar to PHP: d M Y
    const formattedData = data?.map((item: any) => ({
        ...item,
        // Map lowercase DB columns to the Type 'Expense' (PascalCase fields)
        ExpenseID: item.id,
        Category: item.category,
        Details: item.details, // Fixed: Map to 'Details' (was Description)
        PaymentDate: new Date(item.date).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        }),
        Amount: item.amount,
        Remarks: item.remarks,
        Head: item.head || 'N/A'
    })) || [];

    return { data: formattedData as Expense[], total: count || 0 };
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
    const groups: ChandaGroup[] = (data || []).map((item: any) => ({
        id: item.display_name,
        name: item.display_name,
        totalAmount: Number(item.total_amount || 0),
        count: Number(item.donation_count || 0),
        latestDate: item.latest_date,
        latestRemarks: item.latest_remarks || '',
        donations: item.donations || []
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

    let query = supabase
        .from('db_chanda')
        .select('*')
        .order('id', { ascending: false });

    if (search) {
        query = query.or(`name.ilike.%${search}%,hindi_name.ilike.%${search}%,remarks.ilike.%${search}%`);
    }

    const { data: rawData, error } = await query;

    if (error) {
        console.error('Error fetching chanda entries:', error);
        return { groups: [], stats: { totalAmount: 0, totalDonations: 0, avgAmount: 0, maxAmount: 0 } };
    }

    const entries = (rawData || []).map((item: any) => ({
        id: item.id,
        ChandaID: item.id,
        Name: item.name,
        NameHindi: item.hindi_name,
        hindi_name: item.hindi_name,
        Date: item.date,
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

// ... existing codes ...

// ... keep getCategories ...

export async function getExpensePageStats() {
    const supabase = await createClient();

    // Use database function for better performance
    const { data, error } = await supabase.rpc('get_expense_stats');

    if (error || !data || data.length === 0) {
        console.error('Error fetching stats:', error);
        // Fallback to old method
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, category');

        const totalAmount = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const totalTransactions = expenses?.length || 0;
        const totalCategories = new Set(expenses?.map(e => e.category).filter(Boolean)).size;

        return { totalAmount, totalTransactions, totalCategories };
    }

    return {
        totalAmount: data[0].total_amount || 0,
        totalTransactions: Number(data[0].total_transactions) || 0,
        totalCategories: Number(data[0].total_categories) || 0
    };
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
    const { data: rawData, error: rawError } = await supabase
        .from('expenses')
        .select('category');

    if (rawError) {
        console.error('Error fetching categories:', rawError);
        return [];
    }

    // Extract unique non-null categories
    const categories = Array.from(new Set(rawData.map((item: any) => item.category).filter(Boolean)));
    return categories.sort();
}
