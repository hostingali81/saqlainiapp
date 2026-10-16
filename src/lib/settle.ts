/**
 * Lets a page start a data read at the same time as its admin check without
 * letting a failed read decide what happens first: the read's error is held
 * back, and only thrown (by `unwrap`) once the caller has done its check.
 */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

export function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
    return promise.then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
    );
}

export function unwrap<T>(result: Settled<T>): T {
    if (!result.ok) throw result.error;
    return result.value;
}
