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
                    className="p-2"
                >
                    <div
                        className="glass-card rounded-[15px] p-4 flex items-center gap-3 relative overflow-hidden"
                    >
                        {/* Avatar Skeleton */}
                        <Skeleton className="h-[50px] w-[50px] rounded-full bg-[#E5D3AA]/40 flex-shrink-0" />

                        {/* Content Skeleton */}
                        <div className="flex-1 space-y-2">
                            {/* Name */}
                            <Skeleton className="h-4 w-32 bg-[#E5D3AA]/40" />
                            {/* Father Name */}
                            <Skeleton className="h-[0.9rem] w-24 bg-[#E5D3AA]/30" />
                        </div>

                        {/* Due Badge Skeleton */}
                        <Skeleton className="h-7 w-12 rounded-full bg-[#E5D3AA]/40 flex-shrink-0" />

                        {/* Call Button Skeleton */}
                        <Skeleton className="h-[45px] w-[45px] rounded-full bg-[#E5D3AA]/40 flex-shrink-0" />
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
