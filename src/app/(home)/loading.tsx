import { HomeSkeleton } from '@/components/skeletons/HomeSkeleton';

/**
 * Shown the instant someone taps Home, before the server has answered. The
 * page's own Suspense fallback is the same skeleton, so nothing jumps. Lives
 * in the (home) route group so it only applies to "/", not to other pages.
 */
export default function HomeLoading() {
    return (
        <main className="container max-w-md mx-auto p-4 h-screen flex flex-col bg-background">
            <HomeSkeleton />
        </main>
    );
}
