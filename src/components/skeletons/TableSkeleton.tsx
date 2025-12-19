import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="space-y-3">
            {/* Table Header */}
            <div className="flex gap-4 pb-3 border-b border-[#E5D3AA]">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton
                        key={`header-${i}`}
                        className="h-5 flex-1 bg-[#E5D3AA]/40"
                    />
                ))}
            </div>

            {/* Table Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 items-center py-2">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-4 flex-1 bg-[#E5D3AA]/30"
                            style={{
                                width: colIndex === 0 ? '60%' : '100%' // First column slightly narrower
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}
