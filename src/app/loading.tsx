import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="min-h-screen p-4 space-y-4" style={{ background: '#FFF8E7' }}>
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8 transition-opacity delay-300">
                <Skeleton className="h-12 w-48 rounded-full bg-[#E5D3AA]/50" />
                <Skeleton className="h-10 w-24 rounded-full bg-[#E5D3AA]/50" />
            </div>

            {/* Content Skeleton - Simulating Cards/List */}
            <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 rounded-[15px] border border-[#E5D3AA]/30 bg-white/50">
                        <Skeleton className="h-12 w-12 rounded-full bg-[#E5D3AA]/50" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px] bg-[#E5D3AA]/50" />
                            <Skeleton className="h-4 w-[150px] bg-[#E5D3AA]/50" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
