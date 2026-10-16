/**
 * Supabase caps a select at 1000 rows unless you page through it.
 *
 * Several totals were computed from a plain `.select()` and silently went wrong
 * the moment a table crossed 1000 rows - the numbers still rendered, they were
 * just short. This pages until the source is exhausted.
 *
 * The query should end in a unique `.order(...)` (e.g. by id): offset paging
 * without ORDER BY is not guaranteed to be stable, so rows could be skipped
 * or counted twice across pages.
 *
 * Speed: the first page is read on its own (most tables fit in it). Past that,
 * pages are requested a few at a time in parallel instead of one after
 * another - the big `payment` table used to need ~8 back-to-back round trips.
 * Results are still consumed strictly in page order and stop at the first
 * short/empty page or error, so the rows returned are exactly what reading
 * the pages one by one would give.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 200; // hard stop so a misbehaving source cannot spin forever
const PARALLEL_PAGES = 4;

export async function fetchAllRows<T = any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildQuery: () => any
): Promise<{ rows: T[]; error: string | null }> {
    const rows: T[] = [];
    let page = 0;

    while (page < MAX_PAGES) {
        const batch = page === 0 ? 1 : Math.min(PARALLEL_PAGES, MAX_PAGES - page);
        const results = await Promise.all(
            Array.from({ length: batch }, (_, i) => {
                const offset = (page + i) * PAGE_SIZE;
                return buildQuery().range(offset, offset + PAGE_SIZE - 1);
            })
        );

        for (const { data, error } of results) {
            if (error) {
                return { rows, error: error.message };
            }
            if (!data || data.length === 0) {
                return { rows, error: null };
            }

            rows.push(...(data as T[]));

            if (data.length < PAGE_SIZE) {
                return { rows, error: null };
            }
        }

        page += batch;
    }

    return { rows, error: null };
}
