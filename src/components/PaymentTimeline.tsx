import { MonthStatus, Payment } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentTimelineProps {
    history: MonthStatus[];
    payments: Payment[];
    frequency?: string;
}

export function PaymentTimeline({ history, payments, frequency }: PaymentTimelineProps) {
    // Filter history based on frequency (Match PHP Logic)
    const filteredHistory = history.filter(item => {
        if ((frequency === 'Not Regular' || frequency === 'One Time') && item.status === 'due') return false;
        return true;
    });

    // Group payments by month-year
    const getPaymentsForMonth = (year: number, month: number) => {
        return payments.filter(p => p.year === year && p.month === month);
    };

    return (
        <div>
            {filteredHistory.map((item, idx, arr) => (
                <div
                    key={`${item.year}-${item.month}`}
                    className={cn(
                        "flex items-center justify-between p-3 transition-colors",
                        item.status === 'paid' ? "bg-[#f5fff5]" : "bg-[#fff5f5]"
                    )}
                    style={{
                        borderBottom: idx < arr.length - 1 ? '1px solid #E5D3AA' : 'none'
                    }}
                >
                    {/* Date with Icon */}
                    <div className="flex items-center gap-3">
                        {/* Calendar Icon - Simple */}
                        <div className="h-8 w-8 flex items-center justify-center">
                            <svg
                                className="h-6 w-6"
                                fill={item.status === 'paid' ? '#0D483B' : '#dc2626'}
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                            </svg>
                        </div>
                        <span
                            className="font-medium"
                            style={{ color: '#165E4B' }}
                        >
                            {item.monthName} {item.year}
                        </span>
                    </div>

                    {/* Amount/Status */}
                    <div className="flex flex-col items-end gap-1">
                        {item.status === 'paid' ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="font-bold text-base"
                                        style={{ color: '#0D483B' }}
                                    >
                                        ₹{item.amount}
                                    </span>
                                    {item.isPartial && (
                                        <span
                                            className="font-bold text-[10px] px-2 py-0.5 rounded-[12px]"
                                            style={{ background: '#fff3cd', color: '#8a6100' }}
                                        >
                                            PARTIAL
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const monthPayments = getPaymentsForMonth(item.year, item.month);
                                    return monthPayments.length > 1 ? (
                                        <div className="text-xs" style={{ color: '#165E4B' }}>
                                            {monthPayments.map((p, i) => (
                                                <div key={p.id || i}>₹{p.amount}</div>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </>
                        ) : (
                            <span
                                className="font-bold text-xs px-3 py-1 rounded-[12px]"
                                style={{
                                    background: '#f8d7da',
                                    color: '#dc2626'
                                }}
                            >
                                DUE
                            </span>
                        )}
                    </div>
                </div>
            ))}

            {filteredHistory.length === 0 && (
                <div
                    className="text-center p-6"
                    style={{ color: '#165E4B' }}
                >
                    No payment history to show.
                </div>
            )}
        </div>
    );
}
