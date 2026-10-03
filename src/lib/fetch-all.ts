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
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T = any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildQuery: () => any
): Promise<{ rows: T[]; error: string | null }> {
    const rows: T[] = [];
    let offset = 0;

    // Hard stop so a misbehaving source cannot spin forever.
    for (let page = 0; page < 200; page++) {
        const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            return { rows, error: error.message };
        }
        if (!data || data.length === 0) break;

        rows.push(...(data as T[]));

        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return { rows, error: null };
}
