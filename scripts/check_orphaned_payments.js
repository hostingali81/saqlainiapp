const fs = require('fs');
const path = require('path');

function parseCSV(content) {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    // Parse header
    console.log(`Debug - First 3 lines of content length ${content.length}:`);
    lines.slice(0, 3).forEach((l, i) => console.log(`${i}: ${l}`));

    const headers = parseLine(lines[0]);
    console.log('Debug - Headers:', headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseLine(line);
        if (values.length < 2) continue;

        const row = {};
        headers.forEach((header, index) => {
            const key = header.replace(/^"|"$/g, '').trim();
            const val = (values[index] || '').replace(/^"|"$/g, '').trim();
            if (key) row[key] = val;
        });

        if (Object.keys(row).length > 0) data.push(row);
    }
    return data;
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuote = !inQuote;
        else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    result.push(current);
    return result;
}

function check() {
    console.log('🔍 Checking for Orphaned Payments...');

    const userListPath = path.join(__dirname, '../user_list.csv');
    const paymentPath = path.join(__dirname, '../payment.csv');

    if (!fs.existsSync(userListPath) || !fs.existsSync(paymentPath)) {
        console.error('❌ CSV files not found!');
        return;
    }

    const users = parseCSV(fs.readFileSync(userListPath, 'utf8'));
    const payments = parseCSV(fs.readFileSync(paymentPath, 'utf8'));

    // Create Set of valid User IDs
    const validUserIDs = new Set(users.map(u => u.id));

    console.log(`📊 Total Users: ${users.length}`);
    console.log(`📊 Total Payments: ${payments.length}`);

    const orphaned = [];
    payments.forEach(p => {
        // Clean up ID strings (remove quotes if any remain)
        const pid = (p.user_id || '').replace(/"/g, '').trim();
        // Check against valid ID set (which are also cleaned keys)
        if (!validUserIDs.has(pid)) {
            p.reason = `User ID ${pid} not found`;
            orphaned.push(p);
        }
    });

    console.log(`\n⚠️  Found ${orphaned.length} payments with missing users.`);

    if (orphaned.length > 0) {
        fs.writeFileSync(path.join(__dirname, '../orphaned_payments.txt'), JSON.stringify(orphaned, null, 2));
        console.log('📝 List saved to orphaned_payments.txt');
    } else {
        console.log('✅ All payments linked to valid users.');
    }
}

check();
