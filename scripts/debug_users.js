const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://obamcygxpzazfdyvyphz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYW1jeWd4cHphemZkeXZ5cGh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNDMzMCwiZXhwIjoyMDcyMjAwMzMwfQ.JCDDAAPA-4oX-YrRmZjm5mEhJSsfRN76juacARi_Z9c';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const SQL_FILE_PATH = path.join(__dirname, '../phpmysql_Export.sql');

async function debugUsers() {
    console.log('🔍 Starting Debug for User List...');

    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');
    const tableName = 'imaam_user_table';

    // Test regex
    const regex = new RegExp(`INSERT\\s+INTO\\s*[\`"']?${tableName}[\`"']?[\\s\\S]*?VALUES\\s*([\\s\\S]*?);`, 'gi');

    let match = regex.exec(sqlContent);
    if (!match) {
        console.error('❌ NO REGEX MATCH FOUND for imaam_user_table');
        // Let's print a snippet of the file to see if we can find the table name manually
        const index = sqlContent.indexOf(tableName);
        if (index !== -1) {
            console.log('Build Context: Found table name at index', index);
            console.log('Snippet:', sqlContent.substring(index, index + 200));
        } else {
            console.error('❌ Table name literal string NOT FOUND in file!');
        }
        return;
    }

    console.log('✅ Regex match found!');
    const valuesStr = match[1];
    console.log(`VALUES length: ${valuesStr.length}`);

    // Parse logic (simplified from main script)
    let rows = [];
    let currentRow = '';
    let inParen = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        if (inQuote) {
            if (char === quoteChar && valuesStr[i - 1] !== '\\') inQuote = false;
            currentRow += char;
        } else {
            if (char === "'" || char === '"') { inQuote = true; quoteChar = char; currentRow += char; }
            else if (char === '(') { if (inParen === 0) currentRow = ''; inParen++; currentRow += char; }
            else if (char === ')') {
                inParen--; currentRow += char;
                if (inParen === 0) rows.push(currentRow);
            } else if (inParen > 0) currentRow += char;
        }
    }

    console.log(`Parsed ${rows.length} rows.`);
    if (rows.length > 0) {
        console.log('First Row Sample:', rows[0]);
    }

    // Try Insertion
    const users = rows.map(row => {
        let cleanRow = row.slice(1, -1);
        // Quick split (hacky but for debug)
        // Matches: 'string', NULL, number
        const colValues = cleanRow.match(/('(\\.|[^'])*'|[^,]+)/g).map(v => v.trim());
        // (`UserID`, `Name`, `FatherName`, `HindiName`, `HindiFatherName`, `Phone`, `status`)
        const formatVal = (v) => {
            if (v === 'NULL') return null;
            if ((v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1).replace(/\\'/g, "'");
            return isNaN(Number(v)) ? v : Number(v);
        };

        const vals = colValues.map(formatVal);

        let freq = 'Regular';
        if (vals[6] === 'Full-Paid') freq = 'Regular';
        else if (vals[6] === '1-Chhamahi') freq = 'Ramadan';
        else if (vals[6] === '2-Chhamahi') freq = 'Eid-ul-Adha';

        return {
            id: vals[0],
            name: vals[1],
            fname: vals[2],
            hindi_name: vals[3],
            phone: vals[5],
            frequency: freq
        };
    });

    if (users.length > 0) {
        const { error } = await supabase.from('user_list').upsert(users);
        if (error) console.error('❌ Insertion Error:', error);
        else console.log('✅ Successfully inserted users into user_list!');
    }
}

debugUsers().catch(console.error);
