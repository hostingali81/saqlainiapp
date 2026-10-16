import { CardSkeleton } from './CardSkeleton';

/** Member list placeholder: search bar, count line, cards. Goes inside the home page's <main>. */
export function HomeSkeleton() {
    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="h-10 rounded-lg relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite linear'
                }} />
            </div>
            <div className="h-5 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                <div className="absolute inset-0" style={{
                    background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite linear'
                }} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pb-24">
                <CardSkeleton count={6} />
            </div>
        </div>
    );
}
