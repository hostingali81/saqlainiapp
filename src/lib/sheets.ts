import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export async function getAuthClient() {
    const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!jsonKey) {
        throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON in .env.local');
    }

    try {
        const credentials = JSON.parse(jsonKey);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
        return await auth.getClient();
    } catch (e: any) {
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: ' + e.message);
    }
}

export async function getSheetData(range: string) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Missing GOOGLE_SHEET_ID in .env.local');
    }

    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        // Return rows (arrays of strings)
        return response.data.values || [];
    } catch (error: any) {
        console.error(`Error fetching sheet range ${range}:`, error.message);
        throw error;
    }
}

// Helper to Map Sheet Rows to Objects
export function mapRowsToObjects(rows: any[][], mapping: Record<string, string>) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    const data = [];

    // Map DB Column Name -> Index in Sheet
    const colIndexMap: Record<string, number> = {};

    // Iterate over our desired DB columns (keys in mapping)
    // mapping format: { "Sheet Header Name": "db_column_name" }
    // OR we can do mapping format: { "db_column_name": "Sheet Header Name" }
    // Let's stick to the previous logic: Sheet Col -> DB Col

    // Create a lookup for headers
    for (const [sheetHeader, dbCol] of Object.entries(mapping)) {
        const index = headers.indexOf(sheetHeader.toLowerCase());
        if (index !== -1) {
            colIndexMap[dbCol] = index;
        }
    }

    // Process rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.every((c: any) => !c)) continue; // Skip empty rows

        const obj: any = {};
        let hasData = false;

        for (const [dbCol, index] of Object.entries(colIndexMap)) {
            const val = row[index];
            if (val !== undefined && val !== '') {
                obj[dbCol] = cleanValue(val);
                hasData = true;
            }
        }

        if (hasData) data.push(obj);
    }
    return data;
}

function cleanValue(val: any) {
    if (typeof val === 'string') return val.trim();
    return val;
}
