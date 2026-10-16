import { MonthlyHistorySkeleton } from '@/components/skeletons/MonthlyHistorySkeleton';

/** Shown the instant the total is tapped, before the server has answered. */
export default function TotalMonthlyHistoryLoading() {
    return <MonthlyHistorySkeleton />;
}
