'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Notice, inputCls } from '@/components/admin/ui';
import { useRouter } from 'next/navigation';

export function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin');
                router.refresh();
            } else {
                // The API distinguishes bad credentials from "too many attempts".
                setError(data.error || 'Incorrect username or password');
            }
        } catch (err) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md gap-5 rounded-2xl">
            <CardHeader className="items-center text-center">
                <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lock className="h-5 w-5" />
                </span>
                <CardTitle className="font-serif text-2xl text-primary">Admin Login</CardTitle>
                <p className="text-sm text-muted-foreground">Sirf admin ke liye</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Input
                            type="email"
                            placeholder="Email"
                            autoComplete="username"
                            aria-label="Email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className={`${inputCls} w-full`}
                        />
                    </div>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            aria-label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={`${inputCls} w-full pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    {error && <Notice tone="error">{error}</Notice>}
                    <Button type="submit" size="lg" className="w-full rounded-lg" disabled={loading}>
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging in...</> : 'Login'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
