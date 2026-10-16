/**
 * Shown under the (persistent) admin navigation while a section loads, so a
 * tapped pill gets instant feedback even when Google Sheets is slow.
 */
export default function AdminLoading() {
    return (
        <div className="mx-auto mt-5 max-w-xl animate-pulse" aria-busy="true" aria-label="Loading">
            <div className="mb-2 h-8 w-48 rounded-lg bg-muted" />
            <div className="mb-6 h-4 w-72 max-w-full rounded bg-muted/70" />
            <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-10 rounded-lg bg-muted/70" />
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-10 rounded-lg bg-muted/70" />
                <div className="h-10 rounded-lg bg-muted" />
            </div>
        </div>
    );
}
