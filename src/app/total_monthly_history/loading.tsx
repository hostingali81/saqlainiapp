import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen p-4 space-y-6" style={{ background: '#FFF8E7' }}>
            {/* Header Area */}
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-10 w-32 rounded-lg bg-[#E5D3AA]/50" />
                <Skeleton className="h-10 w-10 rounded-full bg-[#E5D3AA]/50" />
            </div>

            {/* Chart Skeleton */}
            <div className="space-y-4">
                <div className="rounded-[15px] p-6 border border-[#E5D3AA]/30 bg-white/50 h-[300px] flex items-end justify-between gap-2 overflow-hidden">
                    {[...Array(10)].map((_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full bg-[#E5D3AA]/40 rounded-t-sm"
                            style={{ height: `${Math.random() * 60 + 20}%` }}
                        />
                    ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 rounded-[15px] bg-white/50 border border-[#E5D3AA]/30" />
                    <Skeleton className="h-24 rounded-[15px] bg-white/50 border border-[#E5D3AA]/30" />
                </div>
            </div>
        </div>
    )
}
