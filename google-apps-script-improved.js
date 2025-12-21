/**
 * Saqlaini App - Combined Script
 * Includes Legacy JSON Export + New Webhook Sync
 */

// ==========================================
// PART 1: LEGACY JSON EXPORT (Existing)
// ==========================================

function doGet(e) {
    Logger.log("doGet called with parameters: " + JSON.stringify(e.parameters));

    if (e.parameters.function) {
        var functionName = e.parameters.function[0];

        if (functionName === 'convertSheetToJson') {
            var sheetName = e.parameters.sheet ? e.parameters.sheet[0] : 'DB2';
            return convertSheetToJson("1-Jri38JWneR68H-YXgFf1hgr7gzvN3aUxriQGyjU06k", sheetName);
        } else if (functionName === 'anotherFunction') {
            return anotherFunction(e);
        } else {
            return ContentService.createTextOutput("Unknown function: " + functionName).setMimeType(ContentService.MimeType.TEXT);
        }
    }

    return ContentService.createTextOutput("Please provide a valid function name in the query parameter.").setMimeType(ContentService.MimeType.TEXT);
}

function convertSheetToJson(spreadsheetId, sheetName) {
    Logger.log("convertSheetToJson called with sheet: " + sheetName);

    var activeSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var dataSheet = activeSpreadsheet.getSheetByName(sheetName);

    if (!dataSheet) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found." })).setMimeType(ContentService.MimeType.JSON);
    }

    var rows = dataSheet.getLastRow();
    var columns = dataSheet.getLastColumn();
    var data = dataSheet.getRange(1, 1, rows, columns).getValues();
    var headers = data[0];
    var records = [];

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var record = {};

        var isRowEmpty = row.every(function (cell) {
            return cell === '';
        });

        if (!isRowEmpty) {
            for (var j = 0; j < headers.length; j++) {
                if (headers[j]) {
                    if (isDate(row[j])) {
                        record[headers[j]] = formatDate(row[j]);
                    } else {
                        record[headers[j]] = row[j] || '';
                    }
                }
            }
            records.push(record);
        }
    }

    return ContentService.createTextOutput(JSON.stringify(records)).setMimeType(ContentService.MimeType.JSON);
}

function isDate(value) {
    return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value);
}

function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function anotherFunction(e) {
    Logger.log("anotherFunction called");
    return ContentService.createTextOutput("This is another function!").setMimeType(ContentService.MimeType.TEXT);
}


// ==========================================
// PART 2: NEW WEBHOOK SYNC (Improved)
// ==========================================

const API_URL = "https://saqlainiapp.vercel.app/api/sync";
const SECRET_TOKEN = "my-secure-sync-token-123";

// Define allowed columns for each table (Supabase schema)
const TABLE_SCHEMAS = {
    "user_list": ["id", "name", "fname", "phone", "frequency", "hindi_name"],
    "payment": ["id", "user_id", "amount", "year", "month"],
    "expenses": ["id", "category", "details", "date", "amount", "remarks", "head"],
    "db_chanda": ["id", "timestamp", "name", "hindi_name", "date", "amount", "remarks"]
};

// Column mapping: Sheet column -> Database column
const COLUMN_MAPPINGS = {
    "DB": {},
    "DB_PAYMENT": {
        "payment_id": "id"
    },
    "DB_Expenses": {
        "ExpensesID": "id",
        "Timestamp": "timestamp",
        "Category": "category",
        "Description": "details",
        "PaymentDate": "date",
        "Amount": "amount",
        "Remarks": "remarks",
        "Head": "head"
    },
    "DB_Chanda": {
        "ChandaID": "id",
        "Timestamp": "timestamp",
        "Name": "name",
        "NameHindi": "hindi_name",
        "Date": "date",
        "Amount": "amount",
        "Remarks": "remarks"
    }
};

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Saqlaini Sync')
        .addItem('Sync All USERS (DB)', 'syncAllUsers')
        .addItem('Sync All PAYMENTS (DB_PAYMENT)', 'syncAllPayments')
        .addItem('Sync All EXPENSES (DB_Expenses)', 'syncAllExpenses')
        .addItem('Sync All CHANDA (DB_Chanda)', 'syncAllChanda')
        .addSeparator()
        .addItem('Sync Selected Row', 'syncSelectedRow')
        .addToUi();
}

function syncAllUsers() {
    syncAllData("DB", "user_list");
}

function syncAllPayments() {
    syncAllData("DB_PAYMENT", "payment");
}

function syncAllExpenses() {
    syncAllData("DB_Expenses", "expenses");
}

function syncAllChanda() {
    syncAllData("DB_Chanda", "db_chanda");
}

function syncSelectedRow() {
    const sheet = SpreadsheetApp.getActiveSheet();
    const row = sheet.getActiveRange().getRow();
    const sheetName = sheet.getName();

    let table = "";
    if (sheetName === "DB") table = "user_list";
    else if (sheetName === "DB_PAYMENT") table = "payment";
    else if (sheetName === "DB_Expenses") table = "expenses";
    else if (sheetName === "DB_Chanda") table = "db_chanda";
    else {
        SpreadsheetApp.getUi().alert("Sheet name match nahi hua. Plz confirm sheet names: DB, DB_PAYMENT, DB_Expenses, DB_Chanda");
        return;
    }

    const data = getRowData(sheet, row, sheetName, table);
    if (data) {
        sendToWebhook(table, data);
    } else {
        SpreadsheetApp.getUi().alert("Row empty hai!");
    }
}

function syncAllData(sheetName, tableName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
        SpreadsheetApp.getUi().alert(`Sheet '${sheetName}' nahi mili!`);
        return;
    }

    const data = getAllData(sheet, sheetName, tableName);
    if (data.length === 0) {
        SpreadsheetApp.getUi().alert("Koi data nahi mila sync karne ke liye.");
        return;
    }

    const chunkSize = 50;
    var successCount = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const success = sendToWebhook(tableName, chunk);
        if (success) successCount += chunk.length;
        Utilities.sleep(500);
    }

    SpreadsheetApp.getUi().alert(`Sync Complete! ${successCount} rows synced to ${tableName}.`);
}

// --- HELPER FUNCTIONS ---

function getRowData(sheet, row, sheetName, tableName) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (values.every(c => c === "")) return null;

    return processRowData(headers, values, sheetName, tableName);
}

function getAllData(sheet, sheetName, tableName) {
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.every(c => c === "")) continue;

        const obj = processRowData(headers, values, sheetName, tableName);
        if (obj) data.push(obj);
    }
    return data;
}

function processRowData(headers, values, sheetName, tableName) {
    let obj = {};
    const allowedColumns = TABLE_SCHEMAS[tableName] || [];
    const columnMapping = COLUMN_MAPPINGS[sheetName] || {};

    for (let i = 0; i < headers.length; i++) {
        let key = String(headers[i]).trim();
        let value = values[i];

        if (!key) continue;

        // Apply column mapping if exists
        let mappedKey = columnMapping[key] || key.toLowerCase();

        // Only include columns that are in the allowed schema
        if (allowedColumns.includes(mappedKey)) {
            if (isDate(value)) {
                value = formatDate(value);
            }
            obj[mappedKey] = value;
        }
    }

    return Object.keys(obj).length > 0 ? obj : null;
}

function sendToWebhook(table, data) {
    const payload = {
        table: table,
        data: data,
        token: SECRET_TOKEN
    };

    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(API_URL, options);
        const respText = response.getContentText();
        Logger.log("Response: " + respText);

        if (response.getResponseCode() !== 200) {
            Logger.log("Sync Error for " + table + ": " + respText);
            return false;
        }
        return true;
    } catch (e) {
        Logger.log("Exception: " + e.toString());
        return false;
    }
}
