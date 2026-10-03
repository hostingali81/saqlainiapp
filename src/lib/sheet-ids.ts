/**
 * How the Google Sheet numbers things. Both ids are POSITIONS, not stored values:
 *
 *  - payment_id (DB_PAYMENT!F) counts the FormResponses rows that have a name,
 *    in sheet order: DB_PAYMENT!A2 is
 *    `QUERY(FormResponses!A2:H, "SELECT B, D, E, G WHERE B IS NOT NULL")`
 *    and F is `=IF(A3<>"", F2+1, "")`.
 *  - member id (DB!B) is 99 + the member's place in
 *    `UNIQUE(FILTER(FormResponses!B2:B, FormResponses!B2:B<>""))`, i.e. the
 *    order in which each fullname FIRST appears in FormResponses.
 *
 * So deleting or renaming a FormResponses row can renumber everything after it.
 * Payment ids only line the database up with the sheet, and a sync re-aligns
 * them. Member ids are different: photos are stored by member id, so shifting
 * them puts photos (and profile links) on the wrong people.
 *
 * `names` below is always FormResponses!B2:B as read from the sheet - index 0
 * is sheet row 2.
 */

const hasName = (v: unknown) => String(v ?? '') !== '';

/** payment_id the sheet gives to the FormResponses row `sheetRow` (1-based). */
export function paymentIdForRow(names: unknown[], sheetRow: number): number {
    let id = 0;
    for (let i = 0; i <= sheetRow - 2 && i < names.length; i++) {
        if (hasName(names[i])) id++;
    }
    return id;
}

/** Fullnames in the order DB!A lists them (first appearance, exact match). */
export function memberOrder(names: unknown[]): string[] {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const v of names) {
        if (!hasName(v)) continue;
        const name = String(v);
        if (!seen.has(name)) {
            seen.add(name);
            order.push(name);
        }
    }
    return order;
}

/**
 * True when changing FormResponses from `before` to `after` leaves every
 * remaining member on the same id. Members may only appear or disappear at
 * the END of the list; anything else renumbers whoever comes after them.
 */
export function memberIdsPreserved(before: unknown[], after: unknown[]): boolean {
    const newIndex = new Map(memberOrder(after).map((name, i) => [name, i]));
    return memberOrder(before).every((name, i) => !newIndex.has(name) || newIndex.get(name) === i);
}

/**
 * True when row `index` (0 = sheet row 2) is the FIRST row of a member who also
 * has later rows. The DB sheet reads a member's phone and frequency with
 * VLOOKUP, i.e. from their first row - remove or rename it and the lookup
 * falls through to a later payment row, which (when written by the app) has
 * neither, so the member silently loses their phone and their Regular status.
 */
export function isFirstOfSeveral(names: unknown[], index: number): boolean {
    const name = String(names[index] ?? '');
    if (name === '') return false;
    for (let i = 0; i < index; i++) {
        if (String(names[i] ?? '') === name) return false;
    }
    for (let i = index + 1; i < names.length; i++) {
        if (String(names[i] ?? '') === name) return true;
    }
    return false;
}

/**
 * Loose form of a fullname for "is this the same person" checks: case and
 * spacing (including around the "/") are ignored.
 */
export function normalizeFullname(value: unknown): string {
    return String(value ?? '')
        .split('/')
        .map(part => part.replace(/\s+/g, ' ').trim().toLowerCase())
        .filter(Boolean)
        .join(' / ');
}
