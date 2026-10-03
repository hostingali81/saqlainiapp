/**
 * Dates in one place.
 *
 * Shown to people:  DD/MM/YYYY  (with time: DD/MM/YYYY HH:MM:SS, 24-hour)
 * Stored / exchanged: ISO        (YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS)
 *
 * The Google Sheet is never sent or read as display text. Text like
 * "03/10/2026" means 3 October or 10 March depending on the sheet's locale and
 * cell format; that is how dates got swapped before. Writes use ISO, which
 * Sheets reads the same way in every locale, and reads use the underlying
 * serial number (see serialToIso*), which does not depend on formatting.
 *
 * Pure string/number helpers - safe on the server and in the browser, and
 * free of timezone surprises (no `new Date("...")` parsing).
 */

const pad = (n: number) => String(n).padStart(2, '0');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Now in IST as ISO parts, whatever timezone this code runs in. */
export function istNow(): { date: string; time: string } {
    const t = new Date(Date.now() + IST_OFFSET_MS);
    return {
        date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
        time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`,
    };
}

/** Today in IST, YYYY-MM-DD. */
export function istToday(): string {
    return istNow().date;
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
    if (!m) return false;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const check = new Date(Date.UTC(y, mo - 1, d));
    return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d;
}

/**
 * Google Sheets serial number (days since 1899-12-30, fraction = time of day,
 * in the sheet's own clock) -> ISO. The serial carries no timezone, so it is
 * converted as-is with UTC arithmetic.
 */
export function serialToIsoDateTime(serial: number): string {
    const ms = Math.round((serial - 25569) * 86400) * 1000; // whole seconds
    const t = new Date(ms);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
}

export function serialToIsoDate(serial: number): string {
    return serialToIsoDateTime(serial).slice(0, 10);
}

/**
 * A date that reached us as text (a cell Sheets could not read as a date, or
 * an ISO value) -> ISO date, or null if it is not clearly one. Slash dates are
 * read as DD/MM/YYYY - the only way anyone types them here.
 */
export function textToIsoDate(text: string): string | null {
    const s = text.trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) {
        const v = `${iso[1]}-${iso[2]}-${iso[3]}`;
        return isIsoDate(v) ? v : null;
    }
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (dmy) {
        const v = `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
        return isIsoDate(v) ? v : null;
    }
    return null;
}

/** "2026-10-03" or "2026-10-03T14:05:09" -> "03/10/2026". Anything else is returned unchanged. */
export function formatDMY(value: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value ?? '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A paid month - "2026-09-01" -> "Sep-26", the same as the sheet's Month_F
 * column. It names a month, not a day, so it is not shown as DD/MM/YYYY.
 */
export function formatMonthYY(value: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})/.exec(String(value ?? ''));
    return m ? `${MONTHS[Number(m[2]) - 1]}-${m[1].slice(2)}` : String(value ?? '');
}

/** "2026-10-03T14:05:09" -> "03/10/2026 14:05:09". Anything else is returned unchanged. */
export function formatDMYTime(value: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value ?? ''));
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6] ?? '00'}` : formatDMY(value);
}
