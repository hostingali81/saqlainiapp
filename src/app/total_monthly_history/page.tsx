import { createClient } from '@/lib/supabase/server';
import { Coins, Wallet, Smartphone, HandCoins, FileText, ArrowUpCircle, TrendingUp, Calendar, Mic } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Import Indian currency formatter

export default async function TotalMonthlyHistory() {
    const supabase = await createClient();

    // Parallel queries for better performance
    const [paymentData, chandaData, expensesData, bakayaData, monthlyData] = await Promise.all([
        supabase.from('payment').select('amount'),
        supabase.from('db_chanda').select('amount'),
        supabase.from('expenses').select('amount, head'),
        supabase.from('user_list').select('bakaya_month'),
        supabase.from('payment').select('year, month, amount, user_id, id')
    ]);

    const totalPayment = paymentData.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalChanda = chandaData.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

    const expensesSaqlaini = expensesData.data?.filter(e => !e.head || e.head === 'SaqlainiApp').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const expensesChanda = expensesData.data?.filter(e => e.head === 'Chanda').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalExpenses = expensesSaqlaini + expensesChanda;

    // 4. Calculate totals
    const grandTotalCollection = totalPayment + totalChanda;
    const availableSaqlaini = totalPayment - expensesSaqlaini;
    const availableChanda = totalChanda - expensesChanda;
    const totalAvailableBalance = availableSaqlaini + availableChanda;

    // 5. Get total due amount
    const totalDueMonths = bakayaData.data?.reduce((sum, u) => sum + (u.bakaya_month || 0), 0) || 0;
    const totalBakayaAmount = totalDueMonths * 125;

    // 6. Get monthly breakdown
    const monthlyBreakdown = monthlyData.data?.reduce((acc: any[], payment) => {
        const key = `${payment.year}-${payment.month}`;
        const existing = acc.find(item => item.key === key);
        if (existing) {
            existing.totalAmount += payment.amount || 0;
            existing.users.add(payment.user_id);
            existing.transactionCount++;
        } else {
            acc.push({
                key, year: payment.year, month: payment.month,
                totalAmount: payment.amount || 0,
                users: new Set([payment.user_id]),
                transactionCount: 1
            });
        }
        return acc;
    }, []) || [];

    const collections = monthlyBreakdown
        .map(item => ({
            year: item.year,
            month: new Date(item.year, item.month - 1).toLocaleString('en-US', { month: 'long' }),
            monthNum: item.month,
            totalUsers: item.users.size,
            totalAmount: item.totalAmount,
            avgAmount: item.totalAmount / item.transactionCount,
            transactionCount: item.transactionCount
        }))
        .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.monthNum - a.monthNum;
        });

    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">

            {/* Page Title */}
            <h1 className="text-2xl font-bold mb-4 text-center" style={{ color: '#0D483B' }}>
                टोटल जमा और खर्च का हिसाब
            </h1>



            {/* COLLECTION & BALANCE SUMMARY - PHP Style */}
            <div
                className="rounded-[15px] p-6 mb-6"
                style={{
                    background: '#FFF8E7',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5D3AA'
                }}
            >
                <h3 className="text-xl font-bold mb-4 pb-2" style={{ color: '#4A3728', borderBottom: '2px solid #E5D3AA' }}>
                    कलेक्शन और बैलेंस (Collection & Balance)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    {/* Grand Total */}
                    <div className="p-4 rounded-[10px] flex flex-col items-center text-center" style={{ background: '#E5D3AA' }}>
                        <Coins className="h-6 w-6 mb-2" style={{ color: '#0D483B' }} />
                        <div className="text-xl font-bold" style={{ color: '#0D483B' }}>₹{formatIndianCurrency(grandTotalCollection)}</div>
                        <div className="text-xs font-semibold" style={{ color: '#4A3728' }}>कुल कलेक्शन (दोनों)</div>
                    </div>

                    {/* Available Balance */}
                    <div className="p-4 rounded-[10px] flex flex-col items-center text-center" style={{ background: '#E5D3AA' }}>
                        <Wallet className="h-6 w-6 mb-2" style={{ color: '#0369a1' }} />
                        <div className="text-xl font-bold" style={{ color: '#0369a1' }}>₹{formatIndianCurrency(totalAvailableBalance)}</div>
                        <div className="text-xs font-semibold" style={{ color: '#4A3728' }}>कुल उपलब्ध बैलेंस</div>
                    </div>

                    {/* Saqlaini Available */}
                    <div className="p-4 rounded-[10px] flex flex-col items-center text-center" style={{ background: 'rgba(229, 211, 170, 0.4)', border: '1px solid #E5D3AA' }}>
                        <Smartphone className="h-5 w-5 mb-1" style={{ color: '#165E4B' }} />
                        <div className="text-lg font-bold" style={{ color: '#165E4B' }}>₹{formatIndianCurrency(availableSaqlaini)}</div>
                        <div className="text-[10px]" style={{ color: '#4A3728' }}>SaqlainiApp Available</div>
                    </div>

                    {/* Chanda Available */}
                    <div className="p-4 rounded-[10px] flex flex-col items-center text-center" style={{ background: 'rgba(229, 211, 170, 0.4)', border: '1px solid #E5D3AA' }}>
                        <HandCoins className="h-5 w-5 mb-1" style={{ color: '#165E4B' }} />
                        <div className="text-lg font-bold" style={{ color: '#165E4B' }}>₹{formatIndianCurrency(availableChanda)}</div>
                        <div className="text-[10px]" style={{ color: '#4A3728' }}>Chanda Available</div>
                    </div>
                </div>
            </div>

            {/* DUE AMOUNT CARD */}
            <div
                className="rounded-[15px] p-4 mb-6 flex items-center justify-between"
                style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca'
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white">
                        <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-sm font-bold text-red-800">सभी यूजर्स पर कुल बकाया रकम</div>
                </div>
                <div className="text-xl font-bold text-red-600">₹{formatIndianCurrency(totalBakayaAmount)}</div>
            </div>

            {/* EXPENSES SUMMARY - PHP Style */}
            <div
                className="rounded-[15px] p-6 mb-6"
                style={{
                    background: '#FFF8E7',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5D3AA'
                }}
            >
                <h3 className="text-xl font-bold mb-4 pb-2" style={{ color: '#4A3728', borderBottom: '2px solid #E5D3AA' }}>
                    कुल खर्च (Total Expenses)
                </h3>

                <div className="flex flex-wrap gap-4 justify-around">
                    <div className="flex flex-col items-center">
                        <div className="text-xs mb-1" style={{ color: '#4A3728' }}>SaqlainiApp</div>
                        <div className="text-lg font-bold text-orange-600">₹{formatIndianCurrency(expensesSaqlaini)}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-xs mb-1" style={{ color: '#4A3728' }}>Chanda</div>
                        <div className="text-lg font-bold text-orange-600">₹{formatIndianCurrency(expensesChanda)}</div>
                    </div>
                    <div className="flex flex-col items-center border-l pl-4 border-[#E5D3AA]">
                        <div className="text-xs mb-1 font-bold" style={{ color: '#4A3728' }}>Total (Both)</div>
                        <div className="text-xl font-bold text-red-600">₹{formatIndianCurrency(totalExpenses)}</div>
                    </div>
                </div>
            </div>

            {/* Audio Generator Link - Moved here */}
            <div className="flex justify-center mb-8">
                <Link href="/audio-generator">
                    <Button
                        className="font-bold rounded-full gap-2 shadow-md px-6 py-6 hover:opacity-90 transition-opacity"
                        style={{
                            background: 'linear-gradient(135deg, #C6A869, #B08D55)',
                            color: '#0D483B',
                            border: '1px solid #FFF8E7'
                        }}
                    >
                        <Mic className="h-5 w-5" />
                        बकाया सूची ऑडियो बनाएँ
                    </Button>
                </Link>
            </div>

            {/* MONTHLY BREAKDOWN LIST - PHP Style */}
            <div
                className="rounded-[15px] overflow-hidden"
                style={{
                    background: '#FFF8E7',
                    border: '1px solid #E5D3AA'
                }}
            >
                <div className="p-4 font-bold text-lg flex items-center gap-2" style={{ background: '#E5D3AA', color: '#0D483B' }}>
                    <TrendingUp className="h-5 w-5" />
                    Monthly Breakdown (SaqlainiApp)
                </div>

                <div>
                    {collections.map((collection, idx) => (
                        <div
                            key={idx}
                            className="p-4 flex flex-col gap-2"
                            style={{
                                borderBottom: idx < collections.length - 1 ? '1px solid #E5D3AA' : 'none',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(229, 211, 170, 0.1)'
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" style={{ color: '#C6A869' }} />
                                    <span className="font-bold text-lg" style={{ color: '#4A3728' }}>
                                        {collection.month} {collection.year}
                                    </span>
                                </div>
                                <span className="font-bold text-xl" style={{ color: '#0D483B' }}>
                                    ₹{formatIndianCurrency(collection.totalAmount)}
                                </span>
                            </div>

                            <div className="flex justify-between text-xs mt-1 px-1">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground">Users</span>
                                    <span className="font-bold" style={{ color: '#165E4B' }}>{collection.totalUsers}</span>
                                </div>
                                <div className="flex flex-col text-center">
                                    <span className="text-muted-foreground">Transactions</span>
                                    <span className="font-bold" style={{ color: '#165E4B' }}>{collection.transactionCount}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-muted-foreground">Avg Payment</span>
                                    <span className="font-bold" style={{ color: '#165E4B' }}>₹{formatIndianCurrency(Math.round(collection.avgAmount))}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
