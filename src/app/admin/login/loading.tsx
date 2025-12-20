import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';

export default function LoginLoading() {
    return (
        <>
            <div className="h-screen flex flex-col bg-background">
                {/* Login Form Skeleton */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Admin Login
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Username skeleton */}
                                <div className="h-10 rounded-md relative overflow-hidden" style={{ background: 'rgba(229, 211, 170, 0.2)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                                {/* Password skeleton */}
                                <div className="h-10 rounded-md relative overflow-hidden" style={{ background: 'rgba(229, 211, 170, 0.2)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                                {/* Button skeleton */}
                                <div className="h-10 rounded-md relative overflow-hidden" style={{ background: 'rgba(229, 211, 170, 0.2)' }}>
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 1.5s infinite linear'
                                    }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <BottomNav />
        </>
    );
}
