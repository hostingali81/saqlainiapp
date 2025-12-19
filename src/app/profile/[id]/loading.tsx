import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
    return (
        <div className="min-h-screen" style={{ background: '#FFF8E7' }}>
            <div className="max-w-[800px] mx-auto p-6 pb-24">
                {/* Profile Header Skeleton */}
                <div
                    className="rounded-[15px] p-6 mb-6 text-center space-y-4"
                    style={{
                        background: '#FFF8E7',
                        border: '1px solid #E5D3AA'
                    }}
                >
                    <Skeleton className="mx-auto h-[150px] w-[150px] rounded-full bg-[#E5D3AA]/30" />
                    <Skeleton className="h-8 w-48 mx-auto rounded bg-[#E5D3AA]/30" />
                    <Skeleton className="h-4 w-32 mx-auto rounded bg-[#E5D3AA]/20" />
                    <Skeleton className="h-4 w-32 mx-auto rounded bg-[#E5D3AA]/20" />

                    {/* Action Buttons Skeleton */}
                    <div className="flex gap-4 justify-center mt-6">
                        <Skeleton className="h-12 w-36 rounded-full bg-[#E5D3AA]/30" />
                        <Skeleton className="h-12 w-36 rounded-full bg-[#E5D3AA]/30" />
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {[1, 2].map(i => (
                        <div
                            key={i}
                            className="rounded-[15px] p-4 flex flex-col items-center gap-2"
                            style={{
                                background: '#FFF8E7',
                                border: '1px solid #E5D3AA'
                            }}
                        >
                            <Skeleton className="h-8 w-16 rounded bg-[#E5D3AA]/30" />
                            <Skeleton className="h-4 w-20 rounded bg-[#E5D3AA]/20" />
                        </div>
                    ))}
                </div>

                {/* Payment Summary Skeleton */}
                <div
                    className="rounded-[15px] p-6 mb-6"
                    style={{
                        background: '#FFF8E7',
                        border: '1px solid #E5D3AA'
                    }}
                >
                    <Skeleton className="h-7 w-48 mb-6 bg-[#E5D3AA]/30" />
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-4 w-20 rounded bg-[#E5D3AA]/20" />
                                <Skeleton className="h-6 w-24 rounded bg-[#E5D3AA]/30" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* History List Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-[15px] border border-[#E5D3AA]/30">
                            <Skeleton className="h-12 w-12 rounded-full bg-[#E5D3AA]/30" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-3/4 rounded bg-[#E5D3AA]/30" />
                                <Skeleton className="h-3 w-1/2 rounded bg-[#E5D3AA]/20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
