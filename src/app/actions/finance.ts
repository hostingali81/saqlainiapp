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
        Head: 'SaqlainiApp' // Default or fetch if exists
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

    let query = supabase
        .from('db_chanda') // lowercase table name
        .select('*')
        .order('id', { ascending: false }); // Latest first

    if (search) {
        // Lowercase columns
        query = query.or(`name.ilike.%${search}%,hindi_name.ilike.%${search}%,remarks.ilike.%${search}%`);
    }

    const { data: rawData, error } = await query;

    if (error) {
        console.error('Error fetching chanda entries:', error);
        return { groups: [], stats: { totalAmount: 0, totalDonations: 0, avgAmount: 0, maxAmount: 0 } };
    }

    // Map Raw DB Data (lowercase) to ChandaEntry (PascalCase)
    const entries = (rawData || []).map((item: any) => ({
        id: item.id, // Required by ChandaEntry
        ChandaID: item.id,
        Name: item.name,
        NameHindi: item.hindi_name,
        hindi_name: item.hindi_name,
        Date: item.date,
        Amount: item.amount,
        Remarks: item.remarks
    })) as ChandaEntry[];

    // Calculate Stats
    const totalAmount = entries.reduce((sum, item) => sum + (item.Amount || 0), 0);
    const totalDonations = entries.length;
    const avgAmount = totalDonations > 0 ? totalAmount / totalDonations : 0;
    const maxAmount = entries.reduce((max, item) => Math.max(max, item.Amount || 0), 0);

    // Group by Name
    const groups: { [key: string]: ChandaGroup } = {};

    entries.forEach(entry => {
        // Use Hindi Name if available, else English Name as key
        const displayName = entry.NameHindi || entry.Name || 'N/A';
        const date = entry.Date || 'N/A';

        if (!groups[displayName]) {
            groups[displayName] = {
                id: displayName,
                name: displayName,
                totalAmount: 0,
                count: 0,
                latestDate: date, // Since we ordered by ID desc, first one is latest
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

    // Fetch all expenses to calculate stats (Assuming dataset is manageable < 1000s for now)
    // For large datasets, use RPC or specific queries.
    const { data: expenses, error } = await supabase
        .from('expenses')
        .select('amount, category');

    if (error) {
        console.error('Error fetching stats:', error);
        return { totalAmount: 0, totalTransactions: 0, totalCategories: 0 };
    }

    const totalAmount = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const totalTransactions = expenses?.length || 0;
    // Count unique non-null categories
    const totalCategories = new Set(expenses?.map(e => e.category).filter(Boolean)).size;

    return {
        totalAmount,
        totalTransactions,
        totalCategories
    };
}

export async function getCategories() {
    const supabase = await createClient();

    // Fetch distinct categories
    // Note: supabase-js doesn't have a direct distinct() with select, 
    // but we can hack it or use a raw query if needed, or just fetch all 'category' and set() them.
    // Efficient way: .select('category') and process in JS for now as list is small.
    // Postgres 'DISTINCT' is supported via modifier? 
    // .select('category', { head: false, distinct: true }) doesn't exist directly like that.
    // Conventional way:
    const { data, error } = await supabase
        .from('expenses')
        .select('category');

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    // Extract unique non-null categories
    const categories = Array.from(new Set(data.map((item: any) => item.category).filter(Boolean)));
    return categories.sort();
}
