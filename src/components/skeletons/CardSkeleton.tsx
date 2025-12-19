import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`card-skeleton-${index}`}
                    className="rounded-[15px] p-4 border border-[#E5D3AA]/30 bg-white/50 transition-all"
                    style={{
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <div className="flex items-start gap-4">
                        {/* Avatar Skeleton */}
                        <Skeleton className="h-[50px] w-[50px] rounded-full bg-[#E5D3AA]/40 flex-shrink-0" />

                        {/* Content Skeleton */}
                        <div className="flex-1 space-y-3">
                            {/* Name and Icon Row */}
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-32 bg-[#E5D3AA]/40" />
                                <Skeleton className="h-5 w-5 rounded bg-[#E5D3AA]/30" />
                            </div>

                            {/* Father Name */}
                            <Skeleton className="h-4 w-24 bg-[#E5D3AA]/30" />

                            {/* Stats Row */}
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-4 w-20 bg-[#E5D3AA]/30" />
                                <Skeleton className="h-4 w-20 bg-[#E5D3AA]/30" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-3">
                                <Skeleton className="h-9 flex-1 rounded-full bg-[#E5D3AA]/40" />
                                <Skeleton className="h-9 w-24 rounded-full bg-[#E5D3AA]/40" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    )
}

// Compact version for grid layouts
export function CardSkeletonCompact({ count = 1 }: CardSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`card-skeleton-compact-${index}`}
                    className="rounded-[15px] p-4 border border-[#E5D3AA]/30 bg-white/50 text-center"
                >
                    {/* Avatar */}
                    <Skeleton className="h-16 w-16 rounded-full bg-[#E5D3AA]/40 mx-auto mb-3" />

                    {/* Name */}
                    <Skeleton className="h-5 w-24 bg-[#E5D3AA]/40 mx-auto mb-2" />

                    {/* Subtitle */}
                    <Skeleton className="h-3 w-20 bg-[#E5D3AA]/30 mx-auto" />
                </div>
            ))}
        </>
    )
}
