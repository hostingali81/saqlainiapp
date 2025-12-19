const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseCSV(content) {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    // Parse header
    const headers = parseLine(lines[0]);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseLine(line);
        if (values.length < 2) continue; // Skip implausible lines

        const row = {};
        headers.forEach((header, index) => {
            const key = header.replace(/^"|"$/g, '').trim();
            const val = (values[index] || '').replace(/^"|"$/g, '').trim();
            if (key) row[key] = val;
        });

        // Ensure required fields
        if (row.payment_id && row.user_id) {
            data.push(row);
        }
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

async function migratePayments() {
    console.log('🚀 Starting Payments Migration...');

    const paymentPath = path.join(__dirname, '../payment.csv');
    if (!fs.existsSync(paymentPath)) {
        console.error('❌ CSV files not found!');
        return;
    }

    const paymentContent = fs.readFileSync(paymentPath, 'utf8');
    const payments = parseCSV(paymentContent);

    console.log(`📊 Found ${payments.length} valid payments.`);

    // Clear Payments
    console.log('🗑️ Clearing payments...');
    const { error: delError } = await supabase.from('payment').delete().neq('id', 0);
    if (delError) console.error('Error clearing payments:', delError);

    // Migrate
    console.log('📦 Migrating Payments...');
    const paymentChunks = chunkArray(payments, 100);
    let successCount = 0;

    for (const [index, chunk] of paymentChunks.entries()) {
        const payload = chunk.map(p => ({
            id: p.payment_id,
            user_id: p.user_id,
            amount: parseInt(p.amount || '0'),
            year: parseInt(p.year || new Date().getFullYear().toString()),
            month: parseInt(p.month || (new Date().getMonth() + 1).toString()),
            date: new Date().toISOString()
        }));

        try {
            const { error } = await supabase.from('payment').insert(payload);
            if (error) {
                if (error.code === '23503') console.warn(`Chunk ${index}: FK Violation (Skipping bad users)`);
                else console.error(`Chunk ${index} Error:`, error.message);
            } else {
                successCount += payload.length;
            }
        } catch (e) {
            console.error(`Chunk ${index} Exception:`, e);
        }

        // Slight delay to avoid rate limits?
        await new Promise(r => setTimeout(r, 50));
    }
    console.log(`✅ Payments migrated: ${successCount}/${payments.length}`);
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

migratePayments();
