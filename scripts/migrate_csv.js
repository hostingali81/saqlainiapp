const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple CSV Parser handling quoted fields
function parseCSV(content) {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    // Parse header
    const headers = parseLine(lines[0]);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length === 0) continue;

        const row = {};
        headers.forEach((header, index) => {
            // Handle duplicate status/headers if any, but clean CSVs usually fine
            // Also trim quotes if present in header/value
            row[header.replace(/^"|"$/g, '')] = (values[index] || '').replace(/^"|"$/g, '');
        });
        data.push(row);
    }
    return data;
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    result.push(current);
    return result;
}

async function migrate() {
    console.log('🚀 Starting CSV Migration (Custom Parser)...');

    // 1. Read CSV Files
    const userListPath = path.join(__dirname, '../user_list.csv');
    const paymentPath = path.join(__dirname, '../payment.csv');

    if (!fs.existsSync(userListPath) || !fs.existsSync(paymentPath)) {
        console.error('❌ CSV files not found!');
        return;
    }

    const userListContent = fs.readFileSync(userListPath, 'utf8');
    const paymentContent = fs.readFileSync(paymentPath, 'utf8');

    // Parse CSVs
    const users = parseCSV(userListContent);
    const payments = parseCSV(paymentContent);

    console.log(`📊 Found ${users.length} users and ${payments.length} payments.`);

    // 2. Clear Existing Data (Truncate)
    console.log('🗑️ Clearing existing data from Supabase...');

    const { error: delPaymentError } = await supabase.from('payment').delete().neq('id', 0);
    if (delPaymentError) console.error('Error clearing payments:', delPaymentError);

    const { error: delUserError } = await supabase.from('user_list').delete().neq('id', 0);
    if (delUserError) console.error('Error clearing users:', delUserError);

    // 3. Migrate Users
    console.log('📦 Migrating Users...');
    const userChunks = chunkArray(users, 100);
    for (const chunk of userChunks) {
        const payload = chunk.map(u => {
            // Debug check for problematic IDs
            if (['310', '311', '312', '313'].includes(u.id)) {
                console.log(`Found User ${u.id}: Name='${u.name}', Hindi='${u.hindi_name}'`);
            }

            return {
                id: u.id,
                name: u.name || '', // Allow empty
                fname: u.fname || '',
                hindi_name: u.hindi_name || '', // Allow empty
                phone: u.phone || '',
                bakaya_month: parseInt(u.bakaya_month || '0'),
                frequency: u.frequency || 'Regular',
                amount: 125
            };
        });

        const { error } = await supabase.from('user_list').insert(payload);
        if (error) {
            console.error('Error inserting users chunk:', error);
            console.log('Sample payload:', payload[0]);
        }
    }
    console.log('✅ Users migrated.');

    // 4. Migrate Payments
    console.log('📦 Migrating Payments...');
    const paymentChunks = chunkArray(payments, 100);
    for (const chunk of paymentChunks) {
        const payload = chunk.map(p => ({
            id: p.payment_id,
            user_id: p.user_id,
            amount: parseInt(p.amount || '0'),
            year: parseInt(p.year || new Date().getFullYear().toString()),
            month: parseInt(p.month || (new Date().getMonth() + 1).toString()),
            date: new Date().toISOString()
        }));

        const { error } = await supabase.from('payment').insert(payload);
        if (error) {
            // Ignore if error is foreign key related and we want to skip bad data
            if (error.code === '23503') console.warn(`Skipping chunk due to missing user_id (FK Violation)`);
            else console.error('Error inserting payments chunk:', error);
        }
    }
    console.log('✅ Payments migrated.');
    console.log('🎉 Migration Completed Successfully!');
}

function chunkArray(array, size) {
    const chunked = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
}

migrate();
