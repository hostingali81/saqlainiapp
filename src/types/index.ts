export interface User {
    id: number;
    name: string;
    fname: string; // Father's Name
    phone: string;
    bakaya_month: number; // Initial due months
    frequency: 'Regular' | 'One Time';
    amount: number; // Monthly amount (usually 125)
    first_payment_year?: number;
    first_payment_month?: number;
    hasImage?: boolean; // True if local image exists in public/upload/small_image
}

export interface Payment {
    id?: number;
    user_id: number;
    month: number;
    year: number;
    amount: number;
    date?: string;
}

export interface MonthStatus {
    year: number;
    month: number;
    monthName: string;
    amount: number;
    status: 'paid' | 'due';
    isPartial?: boolean;
}

export interface UserFinancialSummary {
    totalPaid: number;
    paidMonthsCount: number;
    dueMonthsCount: number;
    minDueAmount: number;
    avgMonthlyPayment: number;
    history: MonthStatus[];
}

/** One allocated month inside a payment. */
export interface AllocatedMonth {
    year: number;
    month: number;
    monthName?: string;
    amount: number;
}

export interface PaymentActionResult {
    success?: boolean;
    allocated?: AllocatedMonth[];
    error?: string;
    /** Saved, but a non-critical follow-up step (sheet write, bakaya refresh) failed. */
    warning?: string;
}

export interface SimpleActionResult {
    success?: boolean;
    error?: string;
}

/** A row of the FormResponses sheet as shown in the admin table. */
export interface PaymentEntryRow {
    rowIndex: number;
    timestamp: string;
    name: string;
    paymentDate: string;
    amount: string;
    month: string;
    monthName: string;
    year: string;
    phone: string;
    remarks: string;
}

export interface PaymentEntriesResult {
    entries: PaymentEntryRow[];
    total: number;
    page: number;
    perPage: number;
    error?: string;
}

export interface Expense {
    id: number;
    PaymentDate: string; // Changed from Date to match DB column name
    Details: string;
    Category?: string; // Added Category
    Amount: number;
    Remarks?: string;
    Head?: string; // Added Head (SaqlainiApp or Chanda)
}

export interface ChandaEntry {
    id: number;
    ChandaID?: number; // Alias for id
    Name: string;
    hindi_name?: string;
    NameHindi?: string; // Alias for hindi_name
    Amount: number;
    Date: string;
    Remarks?: string;
}
