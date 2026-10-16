import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LoginLoading() {
    return (
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
            <Card className="w-full max-w-md gap-5 rounded-2xl" aria-busy="true">
                <CardHeader className="items-center">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="mt-2 h-7 w-40 animate-pulse rounded-lg bg-muted" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="h-11 animate-pulse rounded-lg bg-muted/70" />
                    <div className="h-11 animate-pulse rounded-lg bg-muted/70" />
                    <div className="h-11 animate-pulse rounded-lg bg-muted" />
                </CardContent>
            </Card>
        </div>
    );
}
