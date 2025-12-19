export default function ProfileLoading() {
    return (
        <div className="min-h-screen" style={{ background: '#FFF8E7' }}>
            <div className="max-w-[800px] mx-auto p-6 pb-24">
                {/* Profile Header Skeleton */}
                <div 
                    className="rounded-[15px] p-6 mb-6 text-center"
                    style={{
                        background: '#FFF8E7',
                        border: '1px solid #E5D3AA'
                    }}
                >
                    <div className="mx-auto mb-4 rounded-full" style={{
                        width: '150px',
                        height: '150px',
                        background: 'rgba(198, 168, 105, 0.15)'
                    }} />
                    <div className="h-8 w-48 mx-auto mb-2 rounded" style={{ background: 'rgba(198, 168, 105, 0.15)' }} />
                    <div className="h-4 w-32 mx-auto mb-1 rounded" style={{ background: 'rgba(198, 168, 105, 0.1)' }} />
                    <div className="h-4 w-32 mx-auto rounded" style={{ background: 'rgba(198, 168, 105, 0.1)' }} />
                </div>

                {/* Stats Skeleton */}
                <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {[1, 2].map(i => (
                        <div 
                            key={i}
                            className="rounded-[15px] p-4"
                            style={{
                                background: '#FFF8E7',
                                border: '1px solid #E5D3AA'
                            }}
                        >
                            <div className="h-8 w-16 mx-auto mb-2 rounded" style={{ background: 'rgba(198, 168, 105, 0.15)' }} />
                            <div className="h-4 w-20 mx-auto rounded" style={{ background: 'rgba(198, 168, 105, 0.1)' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
