'use client';

import { useEffect, useState } from 'react';
import { getExpenses, getExpensePageStats, getCategories } from '@/app/actions/finance';
import { Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, IndianRupee, Receipt, Tags, FileDown } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

export function ExpensesForm() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [stats, setStats] = useState<{ totalAmount: number; totalTransactions: number; totalCategories: number } | null>(null);
    const [categories, setCategories] = useState<string[]>(['All']);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const exportToPDF = async () => {
        if (!confirm("Are you sure you want to download the Expense PDF?")) return;

        try {
            setIsExporting(true);
            console.log('Starting PDF export with Hindi font support...');

            // Load fonts
            const fontURL = '/fonts/NotoSansDevanagari-Regular.ttf';
            const fontBoldURL = '/fonts/NotoSansDevanagari-Bold.ttf';

            const [resRegular, resBold] = await Promise.all([
                fetch(fontURL),
                fetch(fontBoldURL)
            ]);

            if (!resRegular.ok || !resBold.ok) {
                console.error('Font fetch failed:', resRegular.status, resBold.status);
                throw new Error(`Failed to fetch fonts: ${resRegular.status} ${resBold.status}`);
            }

            const [fontRegular, fontBold] = await Promise.all([
                resRegular.arrayBuffer(),
                resBold.arrayBuffer()
            ]);

            // Base64 conversion
            const fontBase64 = (buffer: ArrayBuffer) => {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return window.btoa(binary);
            };

            // Prepare new VFS entries
            const vfs = {
                "Hindi-Regular.ttf": fontBase64(fontRegular),
                "Hindi-Bold.ttf": fontBase64(fontBold)
            };

            // Define custom fonts configuration
            const customFonts = {
                NotoSans: {
                    normal: 'Hindi-Regular.ttf',
                    bold: 'Hindi-Bold.ttf',
                    italics: 'Hindi-Regular.ttf',
                    bolditalics: 'Hindi-Bold.ttf'
                }
            };

            // Fetch ALL records for export (respecting current category filter)
            console.log(`Fetching all records for export...`);
            const allDataResponse = await getExpenses(1, 10000, category);
            const allExpenses = allDataResponse.data;

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                defaultStyle: {
                    font: 'NotoSans',
                    fontSize: 10,
                    color: '#4A3728'
                },
                content: [
                    {
                        text: 'Expense Records',
                        style: 'header',
                        alignment: 'center',
                        margin: [0, 0, 0, 5]
                    },
                    {
                        text: `Generated: ${new Date().toLocaleDateString('en-GB')}`,
                        fontSize: 10,
                        color: '#666666',
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    },
                    ...(stats ? [{
                        columns: [
                            { text: `Total Expense: ₹${formatIndianCurrency(stats.totalAmount)}`, style: 'stats', color: '#dc2626' },
                            { text: `Transactions: ${stats.totalTransactions}`, style: 'stats' },
                            { text: `Categories: ${stats.totalCategories}`, style: 'stats' }
                        ],
                        margin: [0, 0, 0, 20]
                    }] : []),
                    {
                        table: {
                            headerRows: 1,
                            widths: [30, 60, '*', 70, 70],
                            body: [
                                [
                                    { text: 'Sr.', style: 'tableHeader' },
                                    { text: 'Date', style: 'tableHeader' },
                                    { text: 'Details', style: 'tableHeader' },
                                    { text: 'Category', style: 'tableHeader' },
                                    { text: 'Amount', style: 'tableHeader', alignment: 'right' }
                                ],
                                ...allExpenses.map((expense, index) => [
                                    { text: (index + 1).toString(), alignment: 'center' },
                                    { text: expense.PaymentDate, alignment: 'center' },
                                    {
                                        stack: [
                                            { text: expense.Details, bold: true },
                                            ...(expense.Remarks ? [{ text: expense.Remarks, fontSize: 8, color: '#666666', margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
                                            ...(expense.Head ? [{ text: `Head: ${expense.Head}`, fontSize: 8, italics: true, color: '#8B7355', margin: [0, 1, 0, 0] as [number, number, number, number] }] : [])
                                        ]
                                    },
                                    { text: expense.Category || '-', alignment: 'center', fontSize: 9 },
                                    { text: `₹${formatIndianCurrency(expense.Amount)}`, alignment: 'right', bold: true, color: '#dc2626' }
                                ])
                            ]
                        },
                        dontBreakRows: true,
                        layout: {
                            fillColor: (rowIndex: number) => rowIndex === 0 ? '#E5D3AA' : (rowIndex % 2 === 0 ? '#FFF8E7' : null),
                            hLineColor: () => '#C6A869',
                            vLineColor: () => '#C6A869'
                        }
                    }
                ],
                styles: {
                    header: {
                        fontSize: 22,
                        bold: true,
                        color: '#0D483B'
                    },
                    stats: {
                        fontSize: 11,
                        bold: true,
                        color: '#4A3728'
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 11,
                        color: '#4A3728'
                    }
                },
                footer: (currentPage: number, pageCount: number) => ({
                    text: `Page ${currentPage} of ${pageCount}`,
                    alignment: 'center',
                    fontSize: 9,
                    color: '#999999',
                    margin: [0, 10, 0, 0]
                })
            };

            // CRITICAL: Pass VFS and fonts directly to createPdf
            (pdfMake as any).createPdf(docDefinition, null, customFonts, vfs).download(
                `Expense_Records_${new Date().toISOString().split('T')[0]}.pdf`,
                () => setIsExporting(false) // Callback when done
            );

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please check console.');
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const expenseResponse = await getExpenses(page, 50, category);
            setExpenses(expenseResponse.data);
            setTotal(expenseResponse.total);
            setLoading(false);
        };
        fetchData();
    }, [page, category]);

    useEffect(() => {
        const init = async () => {
            const [statsData, cats] = await Promise.all([
                getExpensePageStats(),
                getCategories()
            ]);
            setStats(statsData);
            setCategories(['All', ...cats]);
        };
        init();
    }, []);

    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">
            {/* Title & Export Button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: '#0D483B' }}>Expenses</h1>
                <Button
                    onClick={exportToPDF}
                    disabled={loading || expenses.length === 0 || isExporting}
                    className="rounded-[15px]"
                    style={{
                        background: 'linear-gradient(135deg, #0D483B, #165E4B)',
                        color: '#FFF8E7'
                    }}
                >
                    <FileDown className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
                    {isExporting ? 'Generating...' : 'Export PDF'}
                </Button>
            </div>

            {/* STATS CARDS - PHP Style */}
            <div
                className="rounded-[15px] p-6 mb-6"
                style={{
                    background: '#FFF8E7',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5D3AA'
                }}
            >
                <h3
                    className="text-xl font-bold mb-4 pb-2"
                    style={{
                        color: '#4A3728',
                        borderBottom: '2px solid #E5D3AA'
                    }}
                >
                    Expense Summary
                </h3>

                {/* Summary Boxes */}
                <div
                    className="rounded-[10px] p-4 flex flex-wrap gap-4 justify-around"
                    style={{ background: '#E5D3AA' }}
                >
                    {stats ? (
                        <>
                            <div className="flex flex-col items-center">
                                <IndianRupee className="h-5 w-5 mb-1" style={{ color: '#dc2626' }} />
                                <div className="text-xl font-bold text-red-600">
                                    ₹{formatIndianCurrency(stats.totalAmount)}
                                </div>
                                <div className="text-xs" style={{ color: '#4A3728' }}>Total Expense</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <Receipt className="h-5 w-5 mb-1" style={{ color: '#0D483B' }} />
                                <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                    {stats.totalTransactions}
                                </div>
                                <div className="text-xs" style={{ color: '#4A3728' }}>Transactions</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <Tags className="h-5 w-5 mb-1" style={{ color: '#0D483B' }} />
                                <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                    {stats.totalCategories}
                                </div>
                                <div className="text-xs" style={{ color: '#4A3728' }}>Categories</div>
                            </div>
                        </>
                    ) : (
                        <>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="h-5 w-5 rounded-full" style={{ background: 'rgba(198, 168, 105, 0.2)' }} />
                                    <div className="h-6 w-16 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                        <div className="absolute inset-0" style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                            backgroundSize: '200% 100%',
                                            animation: 'shimmer 1.5s infinite linear'
                                        }} />
                                    </div>
                                    <div className="h-3 w-12 rounded" style={{ background: 'rgba(198, 168, 105, 0.1)' }} />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* FILTERS - PHP Style */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => { setCategory(cat); setPage(1); }}
                        className="px-4 py-2 rounded-[15px] text-sm font-medium whitespace-nowrap transition-all"
                        style={{
                            background: category === cat
                                ? 'linear-gradient(135deg, #0D483B, #165E4B)'
                                : '#FFF8E7',
                            color: category === cat ? '#FFF8E7' : '#0D483B',
                            border: `1px solid ${category === cat ? '#C6A869' : '#E5D3AA'}`
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* SEARCH - PHP Style */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#165E4B' }} />
                <Input
                    placeholder="Search details..."
                    className="pl-11 py-3 rounded-[15px]"
                    style={{
                        background: '#FFF8E7',
                        border: '1px solid #E5D3AA',
                        color: '#0D483B'
                    }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* EXPENSE LIST - PHP Style */}
            <div
                className="rounded-[15px] p-6"
                style={{
                    background: '#FFF8E7',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5D3AA'
                }}
            >
                <h3
                    className="text-xl font-bold mb-4 pb-2"
                    style={{
                        color: '#4A3728',
                        borderBottom: '2px solid #E5D3AA'
                    }}
                >
                    Expense History ({total} Records)
                </h3>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex justify-between items-start p-3" style={{ background: 'rgba(248, 215, 218, 0.2)' }}>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                        <div className="absolute inset-0" style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                            backgroundSize: '200% 100%',
                                            animation: 'shimmer 1.5s infinite linear'
                                        }} />
                                    </div>
                                    <div className="h-3 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                                        <div className="absolute inset-0" style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                            backgroundSize: '200% 100%',
                                            animation: 'shimmer 1.5s infinite linear'
                                        }} />
                                    </div>
                                </div>
                                <div className="h-6 w-20 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-10" style={{ color: '#165E4B' }}>No expenses found.</div>
                ) : (
                    <div>
                        {expenses
                            .filter(e => e.Details?.toLowerCase().includes(search.toLowerCase()))
                            .map((expense, idx, arr) => (
                                <div
                                    key={expense.id}
                                    className="flex justify-between items-start p-3"
                                    style={{
                                        borderBottom: idx < arr.length - 1 ? '1px solid #E5D3AA' : 'none',
                                        background: 'rgba(248, 215, 218, 0.2)'
                                    }}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold" style={{ color: '#4A3728' }}>
                                                {expense.Details}
                                            </h3>
                                            {expense.Category && (
                                                <span
                                                    className="text-[10px] px-2 py-0.5 rounded-full"
                                                    style={{
                                                        background: '#E5D3AA',
                                                        color: '#4A3728'
                                                    }}
                                                >
                                                    {expense.Category}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs" style={{ color: '#165E4B' }}>
                                            {expense.PaymentDate} {expense.Remarks ? `• ${expense.Remarks}` : ''}
                                            {expense.Head && (
                                                <span className="ml-2" style={{ color: '#8B7355', fontStyle: 'italic' }}>
                                                    • {expense.Head}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <span className="font-mono font-bold text-red-600 text-lg">
                                        ₹{expense.Amount}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '2px solid #E5D3AA' }}>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => p - 1)}
                        style={{
                            background: page === 1 ? '#f5f5f5' : '#FFF8E7',
                            border: '1px solid #E5D3AA',
                            color: '#0D483B'
                        }}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-medium" style={{ color: '#165E4B' }}>
                        Page {page} of {Math.ceil(total / 50)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={expenses.length < 50 || loading}
                        onClick={() => setPage(p => p + 1)}
                        style={{
                            background: expenses.length < 50 ? '#f5f5f5' : '#FFF8E7',
                            border: '1px solid #E5D3AA',
                            color: '#0D483B'
                        }}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </main>
    );
}
