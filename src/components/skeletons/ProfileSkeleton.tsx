export function ProfileSkeleton() {
    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">
            {/* Profile Header */}
            <div className="glass-card rounded-[15px] p-6 mb-6 text-center">
                {/* Avatar */}
                <div className="h-[150px] w-[150px] mx-auto mb-4 rounded-full relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.2)', border: '3px solid #C6A869' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>

                {/* Name */}
                <div className="h-7 w-48 mx-auto mb-2 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                    <div className="h-5 w-40 mx-auto rounded relative overflow-hidden" style={{ background: 'rgba(22, 94, 75, 0.15)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(22, 94, 75, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                    <div className="h-5 w-36 mx-auto rounded relative overflow-hidden" style={{ background: 'rgba(22, 94, 75, 0.15)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(22, 94, 75, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 justify-center flex-col sm:flex-row">
                    <div className="h-12 w-[140px] mx-auto sm:mx-0 rounded-[25px] relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.2)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                    <div className="h-12 w-[140px] mx-auto sm:mx-0 rounded-[25px] relative overflow-hidden" style={{ background: 'rgba(37, 211, 102, 0.2)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(37, 211, 102, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {[1, 2].map(i => (
                    <div key={i} className="glass-card rounded-[15px] p-4 text-center">
                        <div className="h-8 w-24 mx-auto mb-2 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.15)' }}>
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite linear'
                            }} />
                        </div>
                        <div className="h-4 w-20 mx-auto rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite linear'
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Payment Summary */}
            <div className="glass-card rounded-[15px] p-6 mb-6">
                <div className="h-6 w-40 mb-4 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
                <div className="rounded-[10px] p-4 mb-6 flex flex-wrap gap-4 justify-around" style={{ background: 'rgba(229, 211, 170, 0.4)', border: '1px solid rgba(198, 168, 105, 0.3)' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="h-4 w-20 mb-1 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.2)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                            <div className="h-6 w-16 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.2)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment History */}
            <div className="glass-card rounded-[15px] p-6">
                <div className="h-6 w-36 mb-4 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full relative overflow-hidden flex-shrink-0" style={{ background: 'rgba(198, 168, 105, 0.2)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.15)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                                <div className="h-4 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(74, 55, 40, 0.1)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(74, 55, 40, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                            </div>
                            <div className="h-6 w-20 rounded relative overflow-hidden" style={{ background: 'rgba(13, 72, 59, 0.15)' }}>
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(13, 72, 59, 0.3), transparent)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite linear'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
