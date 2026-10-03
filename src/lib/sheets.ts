import { google } from 'googleapis';
import { istNow, isIsoDate, serialToIsoDate, serialToIsoDateTime, textToIsoDate } from '@/lib/dates';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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

/**
 * Cell values of `range`.
 *
 * By default each cell comes back as the text the sheet DISPLAYS - fine for
 * names, but a date then depends on the cell's format and the sheet's locale
 * ("03/10/2026" is 3 October or 10 March). Pass `{ raw: true }` for the
 * underlying values instead: numbers as numbers and dates as serial numbers
 * (see serialToIso* in dates.ts), the same whatever the formatting.
 */
export async function getSheetData(range: string, options: { raw?: boolean } = {}) {
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
            ...(options.raw ? { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' } : {}),
        });

        return response.data.values || [];
    } catch (error: any) {
        console.error(`Error fetching sheet range ${range}:`, error.message);
        throw error;
    }
}

export async function updateSheetRow(range: string, values: any[][]) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Missing GOOGLE_SHEET_ID in .env.local');
    }

    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`Error updating sheet range ${range}:`, error.message);
        throw error;
    }
}

export async function deleteSheetRow(rowIndex: number, sheetId: number = 0) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Missing GOOGLE_SHEET_ID in .env.local');
    }

    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`Error deleting row ${rowIndex}:`, error.message);
        throw error;
    }
}

/** Which columns (0-based) of a sheet hold dates, and whether with a time. */
export type DateColumns = Record<number, 'date' | 'datetime'>;

/**
 * Raw cell -> the text the app works with: dates as ISO, other numbers as
 * plain digits, text as-is. Independent of formatting and locale, so the same
 * cell always gives the same string.
 */
export function normalizeCell(value: unknown, kind?: 'date' | 'datetime'): string {
    if (value === undefined || value === null) return '';
    if (kind && typeof value === 'number') {
        return kind === 'date' ? serialToIsoDate(value) : serialToIsoDateTime(value);
    }
    if (kind && typeof value === 'string') {
        // A date cell holding text (Sheets could not read it as a date).
        return textToIsoDate(value) ?? value.trim();
    }
    return typeof value === 'string' ? value.trim() : String(value);
}

/** Rows of `range` read raw and normalized (see normalizeCell). */
export async function readNormalizedRows(range: string, dates: DateColumns): Promise<string[][]> {
    const rows = await getSheetData(range, { raw: true });
    return rows.map(row => {
        const width = Math.max(row.length, ...Object.keys(dates).map(c => Number(c) + 1));
        return Array.from({ length: width }, (_, i) => normalizeCell(row[i], dates[i]));
    });
}

/**
 * `rowIndex` comes from a list the admin loaded earlier, so by the time an
 * Edit/Delete runs the sheet may have shifted (another admin deleting a row, a
 * manual edit, a re-sort) and the index would point at somebody else's entry.
 * Re-read the row and confirm it still holds what the admin was looking at.
 *
 * `rowIndex` is 0-based with the header at 0. `expected` maps a 0-based column
 * to the value the list showed for it - normalized with the same `dates`, so
 * the check does not depend on how the sheet formats dates. Compare enough
 * columns to tell apart rows written together - a multi-month payment writes
 * several rows with the same timestamp and name.
 */
export async function verifySheetRow(
    sheet: string,
    lastColumn: string,
    rowIndex: number,
    expected: Record<number, unknown>,
    dates: DateColumns = {}
): Promise<string | null> {
    // Row 0 is the header; data starts at index 1. Never touch the header.
    if (!Number.isInteger(rowIndex) || rowIndex < 1) {
        return 'Invalid entry reference. Please refresh the list and try again.';
    }

    const sheetRow = rowIndex + 1;
    const row = (await readNormalizedRows(`${sheet}!A${sheetRow}:${lastColumn}${sheetRow}`, dates))[0];

    if (!row || row.every(c => c === '')) {
        return 'This entry no longer exists. Please refresh the list and try again.';
    }

    const norm = (v: unknown) => String(v ?? '').trim();
    const changed = Object.entries(expected).some(([col, value]) => norm(row[Number(col)]) !== norm(value));
    if (changed) {
        return 'This entry changed since the list was loaded. Please refresh the list and try again.';
    }

    return null;
}

/**
 * "Now" for a sheet timestamp, in IST (the server runs in UTC), as ISO
 * "YYYY-MM-DD HH:MM:SS". Sheets reads ISO the same way in every locale; the
 * column's format then shows it as DD/MM/YYYY HH:MM:SS. (It used to write
 * MM/DD/YYYY, which only worked while the sheet stayed in a US locale.)
 */
export function sheetTimestamp(): string {
    const { date, time } = istNow();
    return `${date} ${time}`;
}

/**
 * A date-input value (YYYY-MM-DD) checked and returned as-is for the sheet,
 * or null if it is not a real date. ISO for the same reason as sheetTimestamp.
 */
export function toSheetDate(value: string | null | undefined): string | null {
    const v = String(value ?? '').trim();
    return isIsoDate(v) ? v : null;
}

// Helper to Map Sheet Rows to Objects
export function mapRowsToObjects(rows: any[][], mapping: Record<string, string>) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map((h: any) => String(h ?? '').trim().toLowerCase());
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
        // Check if row is physically empty or all cells are empty strings
        if (!row || row.length === 0 || row.every((c: any) => c === '' || c === undefined || c === null)) continue;

        const obj: any = {};

        for (const [dbCol, index] of Object.entries(colIndexMap)) {
            // Safe access
            const val = row[index];
            if (val !== undefined && val !== null && val !== '') {
                obj[dbCol] = cleanValue(val);
            }
        }

        // CRITICAL: Ensure we have an ID. If ID is missing, we can't sync it.
        // This prevents "undefined" rows from breaking the logic.
        if (obj.id) {
            data.push(obj);
        }
    }
    return data;
}

/**
 * Sheet rows (1-based) that hold data but are missing their id or one of the
 * `required` columns.
 *
 * mapRowsToObjects quietly drops rows without an id, and the sync then DELETES
 * whatever the database holds that the sheet no longer lists. The ids in the
 * DB_PAYMENT and DB sheets come from formulas filled down to a fixed row, so
 * once data grows past that row new payments would silently vanish from the
 * app at every sync. Callers refuse to sync instead.
 */
export function findIncompleteRows(rows: any[][], mapping: Record<string, string>, required: string[] = []): number[] {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map((h: any) => String(h ?? '').trim().toLowerCase());
    const cols = Object.entries(mapping)
        .map(([sheetHeader, dbCol]) => ({ dbCol, index: headers.indexOf(sheetHeader.toLowerCase()) }))
        .filter(c => c.index !== -1);
    const filled = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';

    const incomplete: number[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const present = new Set(cols.filter(c => filled(row[c.index])).map(c => c.dbCol));
        if (present.size === 0) continue; // blank row (formulas returning "")
        if (!present.has('id') || required.some(col => !present.has(col))) {
            incomplete.push(i + 1);
        }
    }
    return incomplete;
}

/** First and last row (1-based) of an A1 range such as "FormResponses!A7103:I7105". */
export function parseRowSpan(a1: string | null | undefined): { start: number; end: number } | null {
    const m = /![A-Z]+(\d+)(?::[A-Z]+(\d+))?$/.exec(a1 ?? '');
    if (!m) return null;
    const start = Number(m[1]);
    return { start, end: m[2] ? Number(m[2]) : start };
}

function cleanValue(val: any) {
    if (typeof val === 'string') return val.trim();
    return val;
}

export async function appendToSheet(range: string, values: any[][]) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Missing GOOGLE_SHEET_ID in .env.local');
    }

    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values
            }
        });
        return response.data;
    } catch (error: any) {
        console.error(`Error appending to sheet range ${range}:`, error.message);
        throw error;
    }
}
