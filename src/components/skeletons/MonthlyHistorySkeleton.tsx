export function MonthlyHistorySkeleton() {
    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">
            {/* Title - Static */}
            <h1 className="text-2xl font-bold mb-4 text-center" style={{ color: '#0D483B' }}>
                टोटल जमा और खर्च का हिसाब
            </h1>

            {/* Collection & Balance Card */}
            <div className="rounded-[15px] p-6 mb-6" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <h3 className="text-xl font-bold mb-4 pb-2" style={{ color: '#4A3728', borderBottom: '2px solid #E5D3AA' }}>
                    कलेक्शन और बैलेंस (Collection & Balance)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 rounded-[10px] flex flex-col items-center text-center" style={{ background: i <= 2 ? '#E5D3AA' : 'rgba(229, 211, 170, 0.4)', border: i > 2 ? '1px solid #E5D3AA' : 'none' }}>
                            <div className="h-6 w-6 mb-2 rounded-full relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.2)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                            <div className="h-6 w-20 mb-1 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.15)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                            <div className="h-3 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Due Amount Card */}
            <div className="rounded-[15px] p-4 mb-6 flex items-center justify-between" style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full relative overflow-hidden" style={{ background: 'rgba(220, 38, 38, 0.2)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                    <div className="text-sm font-bold text-red-800">सभी यूजर्स पर कुल बकाया रकम</div>
                </div>
                <div className="h-6 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(220, 38, 38, 0.2)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
            </div>

            {/* Expenses Card */}
            <div className="rounded-[15px] p-6 mb-6" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <h3 className="text-xl font-bold mb-4 pb-2" style={{ color: '#4A3728', borderBottom: '2px solid #E5D3AA' }}>
                    कुल खर्च (Total Expenses)
                </h3>
                <div className="flex gap-4 justify-around">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="text-xs mb-1" style={{ color: '#4A3728' }}>{i === 1 ? 'SaqlainiApp' : i === 2 ? 'Chanda' : 'Total (Both)'}</div>
                            <div className="h-5 w-20 rounded relative overflow-hidden" style={{ background: 'rgba(234, 88, 12, 0.2)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(234, 88, 12, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="rounded-[15px] overflow-hidden" style={{ background: '#FFF8E7', border: '1px solid #E5D3AA' }}>
                <div className="p-4 font-bold text-lg flex items-center gap-2" style={{ background: '#E5D3AA', color: '#0D483B' }}>
                    <div className="h-5 w-5 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.2)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                    Monthly Breakdown (SaqlainiApp)
                </div>
                <div>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="p-4" style={{ borderBottom: '1px solid #E5D3AA' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="h-5 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                                <div className="h-6 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.15)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                            </div>
                            <div className="flex justify-between">
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">{j === 1 ? 'Users' : j === 2 ? 'Transactions' : 'Avg Payment'}</span>
                                        <div className="h-4 w-12 rounded relative overflow-hidden" style={{ background: 'rgba(22, 94, 75, 0.15)' }}>
                                            <div className="absolute inset-0" style={{
                                                background: 'linear-gradient(90deg, transparent, rgba(22, 94, 75, 0.3), transparent)',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 1.5s infinite linear'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
