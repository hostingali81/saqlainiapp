const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Note: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Simple CSV parser
function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            rows.push(row);
        }
    }

    return rows;
}

async function migrateExpenses() {
    console.log('Starting Expenses migration...');

    const csvPath = path.join(__dirname, '..', 'Expenses.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`Parsed ${rows.length} expense records`);

    // Clear existing data
    await supabase.from('expenses').delete().neq('id', 0);
    console.log('Cleared existing expenses');

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const payload = batch.map(row => ({
            id: parseInt(row.ExpenseID) || null,
            category: row.Category || null,
            details: row.Description || null,
            date: row.PaymentDate || null,
            amount: parseFloat(row.Amount) || 0,
            remarks: row.Remarks || null,
            head: row.Head || 'SaqlainiApp'  // Default to SaqlainiApp if missing
        }));

        const { error } = await supabase.from('expenses').upsert(payload);
        if (error) {
            console.error(`Error inserting expenses batch ${i}:`, error);
        } else {
            console.log(`Inserted expenses ${i + 1} to ${Math.min(i + batchSize, rows.length)}`);
        }
    }

    console.log('✅ Expenses migration complete!');
}

async function migrateChanda() {
    console.log('Starting Chanda migration...');

    const csvPath = path.join(__dirname, '..', 'DB_Chanda.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`Parsed ${rows.length} chanda records`);

    // Clear existing data
    await supabase.from('db_chanda').delete().neq('id', 0);
    console.log('Cleared existing chanda');

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const payload = batch.map(row => ({
            id: parseInt(row.ChandaID) || null,
            timestamp: row.Timestamp || null,
            name: row.Name || null,
            hindi_name: row.NameHindi || null,
            date: row.Date || null,
            amount: parseFloat(row.Amount) || 0,
            remarks: row.Remarks || null
        }));

        const { error } = await supabase.from('db_chanda').upsert(payload);
        if (error) {
            console.error(`Error inserting chanda batch ${i}:`, error);
        } else {
            console.log(`Inserted chanda ${i + 1} to ${Math.min(i + batchSize, rows.length)}`);
        }
    }

    console.log('✅ Chanda migration complete!');
}

async function main() {
    try {
        await migrateExpenses();
        await migrateChanda();
        console.log('\n🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
