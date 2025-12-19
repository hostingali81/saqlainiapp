const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration (Extracted from config.php)
const SUPABASE_URL = 'https://obamcygxpzazfdyvyphz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYW1jeWd4cHphemZkeXZ5cGh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNDMzMCwiZXhwIjoyMDcyMjAwMzMwfQ.JCDDAAPA-4oX-YrRmZjm5mEhJSsfRN76juacARi_Z9c';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SQL_FILE_PATH = path.join(__dirname, '../phpmysql_Export.sql');

async function migrate() {
    console.log('🚀 Starting migration...');

    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');

    // Helper to extract values from INSERT statements
    const extractValues = (tableName) => {
        // Regex to find the INSERT INTO statement for the specific table
        // Case insensitive for table name? SQL dump usually has consistent casing but let's be safe.
        // The pattern is: INSERT INTO `TableName` (...) VALUES (Row1), (Row2), ...;
        // The parser needs to be robust against newlines in values.

        // Flexible regex for INSERT statement
        // Matches: INSERT INTO `table` OR INSERT INTO table
        // Handles optional quotes, flexible spaces, and column definitions
        const regex = new RegExp(`INSERT\\s+INTO\\s*[\`"']?${tableName}[\`"']?[\\s\\S]*?VALUES\\s*([\\s\\S]*?);`, 'gi');
        let match;
        const allData = [];

        console.log(`🔍 Searching for table: ${tableName}`);
        let matchCount = 0;

        while ((match = regex.exec(sqlContent)) !== null) {
            matchCount++;
            // match[1] contains the values part: (val1, val2), (val3, val4) ...
            let valuesStr = match[1];
            console.log(`   Found match #${matchCount}, length: ${valuesStr.length}`);

            // Basic parser for comma separated value groups enclosed in parentheses
            // We iterate character by character to handle quotes correctly
            let rows = [];
            let currentRow = '';
            let inParen = 0;
            let inQuote = false;
            let quoteChar = '';

            for (let i = 0; i < valuesStr.length; i++) {
                const char = valuesStr[i];

                if (inQuote) {
                    if (char === quoteChar && valuesStr[i - 1] !== '\\') { // Check for unescaped quote
                        inQuote = false;
                    }
                    currentRow += char;
                } else {
                    if (char === "'" || char === '"') {
                        inQuote = true;
                        quoteChar = char;
                        currentRow += char;
                    } else if (char === '(') {
                        if (inParen === 0) currentRow = ''; // Start of new row
                        inParen++;
                        currentRow += char;
                    } else if (char === ')') {
                        inParen--;
                        currentRow += char;
                        if (inParen === 0) { // End of row
                            // Push the complete row string like "(1, 'Name', ...)"
                            rows.push(currentRow);
                        }
                    } else if (inParen > 0) {
                        currentRow += char;
                    }
                }
            }

            rows.forEach(row => {
                // Remove outer parens
                let cleanRow = row.slice(1, -1);

                // Now split columns by comma, respecting quotes
                const colValues = [];
                let currentVal = '';
                let inColQuote = false;
                let colQuoteChar = '';

                for (let j = 0; j < cleanRow.length; j++) {
                    const c = cleanRow[j];
                    if (inColQuote) {
                        if (c === colQuoteChar && cleanRow[j - 1] !== '\\') {
                            inColQuote = false;
                        }
                        currentVal += c;
                    } else {
                        if (c === "'" || c === '"') {
                            inColQuote = true;
                            colQuoteChar = c;
                            currentVal += c;
                        } else if (c === ',') {
                            colValues.push(currentVal.trim());
                            currentVal = '';
                        } else {
                            currentVal += c;
                        }
                    }
                }
                colValues.push(currentVal.trim()); // Last value

                // Map to object assuming column order from known schema
                // (Dynamic column mapping from parsing "INSERT INTO table (col1, col2)" is better but complex)

                // We will rely on manual index mapping based on the known SQL dump structure
                // extracted from the file view earlier.

                // Processing values
                const processedVals = colValues.map(val => {
                    if (val === 'NULL') return null;
                    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                        return val.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
                    }
                    return isNaN(Number(val)) ? val : Number(val);
                });

                allData.push(processedVals);
            });
        }
        return allData;
    };

    // 1. Migrate Expenses
    console.log('📦 Migrating Expenses...');
    const expenseRows = extractValues('Expenses');
    if (expenseRows.length > 0) {
        // SQL: (`ExpenseID`, `Category`, `Description`, `PaymentDate`, `Amount`, `Remarks`, `Head`)
        const expensePayload = expenseRows.map(vals => ({
            id: vals[0],
            category: vals[1],
            details: vals[2],
            date: vals[3], // PaymentDate
            amount: vals[4],
            remarks: vals[5]
        }));

        // Supabase table: expenses (lowercase)
        const { error } = await supabase.from('expenses').upsert(expensePayload);
        if (error) console.error('❌ Error migrating Expenses:', error);
        else console.log(`✅ Migrated ${expenseRows.length} Expenses`);
    }

    // 2. Migrate DB_Chanda
    console.log('📦 Migrating DB_Chanda...');
    const chandaRows = extractValues('DB_Chanda');
    if (chandaRows.length > 0) {
        // SQL: (`ChandaID`, `Timestamp`, `Name`, `NameHindi`, `Date`, `Amount`, `Remarks`)
        const chandaPayload = chandaRows.map(vals => ({
            id: vals[0],
            name: vals[2],
            hindi_name: vals[3],
            amount: vals[5],
            remarks: vals[6],
            date: vals[4] // Date column
        }));

        const { error } = await supabase.from('db_chanda').upsert(chandaPayload); // table: db_chanda
        if (error) console.error('❌ Error migrating DB_Chanda:', error);
        else console.log(`✅ Migrated ${chandaRows.length} Chanda records`);
    }

    // 3. Migrate User List (Table: imaam_user_table)
    console.log('📦 Migrating User List...');
    const userRows = extractValues('imaam_user_table');
    if (userRows.length > 0) {
        // SQL: (`UserID`, `Name`, `FatherName`, `HindiName`, `HindiFatherName`, `Phone`, `status`)
        const userPayload = userRows.map(vals => {
            let freq = 'Regular';
            if (vals[6] === 'Full-Paid') freq = 'Regular';
            else if (vals[6] === '1-Chhamahi') freq = 'Ramadan';
            else if (vals[6] === '2-Chhamahi') freq = 'Eid-ul-Adha';

            return {
                id: vals[0],
                name: vals[1],
                fname: vals[2],
                hindi_name: vals[3],
                hindi_fname: vals[4], // Added hindi_fname
                phone: vals[5],
                frequency: freq
            };
        });

        const { error } = await supabase.from('user_list').upsert(userPayload);
        if (error) console.error('❌ Error migrating User List:', error);
        else console.log(`✅ Migrated ${userRows.length} Users`);
    }

    // 4. Migrate Payments (Table: imaam_payment_table)
    console.log('📦 Migrating Payments...');
    const paymentRows = extractValues('imaam_payment_table');
    if (paymentRows.length > 0) {
        // SQL: (`PaymentID`, `UserID`, `Amount`, `Chhamahi`, `Year`, `Remark`, `Date`)
        const paymentPayload = paymentRows.map(vals => {
            const dateStr = vals[6];
            const dateObj = new Date(dateStr);
            const month = dateObj.getMonth() + 1;

            return {
                id: vals[0],
                user_id: vals[1],
                amount: vals[2],
                year: vals[4],
                month: month,
                date: dateStr
            };
        });

        // Ensure user_list is populated first!
        const { error } = await supabase.from('payment').upsert(paymentPayload);
        if (error) console.error('❌ Error migrating Payments:', error);
        else console.log(`✅ Migrated ${paymentRows.length} Payments`);
    }

    console.log('🎉 Migration Completed!');
}

migrate().catch(console.error);
