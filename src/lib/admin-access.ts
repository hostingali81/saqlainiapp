/**
 * Who counts as an admin.
 *
 * Being signed in is not enough. Supabase accepts public sign-ups unless they
 * are switched off in the dashboard, and the anon key ships to every browser,
 * so anyone could create an account and walk straight into the admin panel.
 *
 * An admin is a user whose `app_metadata.role` is "admin" (only settable with
 * the service-role key, never by the user) or whose email is listed in the
 * comma-separated ADMIN_EMAILS env var. With neither configured nobody is an
 * admin - this fails closed.
 *
 * Kept free of server-only imports so the proxy can use it too.
 */
type MaybeUser = {
    email?: string | null;
    app_metadata?: Record<string, unknown>;
} | null | undefined;

function adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
}

export function isAdminUser(user: MaybeUser): boolean {
    if (!user) return false;
    if (user.app_metadata?.role === 'admin') return true;

    const email = user.email?.trim().toLowerCase();
    return !!email && adminEmails().includes(email);
}
