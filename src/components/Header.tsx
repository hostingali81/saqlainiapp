import Link from 'next/link';
import Image from 'next/image';
import { formatIndianCurrency } from '@/lib/utils';

interface HeaderProps {
    totalAmount: number | null;
}

export function Header({ totalAmount }: HeaderProps) {
    const formattedAmount = totalAmount !== null ? formatIndianCurrency(totalAmount) : null;

    return (
        <header className="sticky top-0 z-40 glass-header">
            {/* Radial dot pattern overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(198, 168, 105, 0.3) 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                    opacity: 0.15
                }}
            />

            <div className="container max-w-md mx-auto px-4 py-4 flex items-center justify-between relative z-10">
                {/* Logo + App Name with pulse glow */}
                <Link href="/" className="flex items-center gap-3 smooth-hover">
                    <div className="relative pulse-glow overflow-hidden rounded-full">
                        <Image
                            src="/upload/logo.png"
                            alt="SaqlainiApp Logo"
                            width={45}
                            height={45}
                            className="rounded-full glass-avatar"
                        />
                    </div>
                    <span
                        className="font-bold text-[22px] tracking-wide"
                        style={{
                            color: '#FFF8E7',
                            textShadow: '0 2px 10px rgba(198, 168, 105, 0.3)'
                        }}
                    >
                        SaqlainiApp
                    </span>
                </Link>

                {/* Total Amount with glass effect */}
                <Link
                    href="/total_monthly_history"
                    className="relative smooth-hover gold-glow"
                >
                    {formattedAmount !== null ? (
                        <div
                            className="px-4 py-2 rounded-full text-base font-bold overflow-hidden"
                            style={{
                                background: 'rgba(198, 168, 105, 0.25)',
                                backdropFilter: 'blur(10px)',
                                color: '#FFF8E7',
                                border: '1px solid rgba(198, 168, 105, 0.5)',
                                boxShadow: '0 4px 12px rgba(198, 168, 105, 0.2) inset'
                            }}
                        >
                            ₹{formattedAmount}
                        </div>
                    ) : (
                        <div
                            className="px-4 py-2 rounded-full text-base font-bold relative overflow-hidden"
                            style={{
                                background: 'rgba(198, 168, 105, 0.15)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(198, 168, 105, 0.5)',
                                width: '100px',
                                height: '36px'
                            }}
                        >
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite linear'
                            }} />
                        </div>
                    )}
                </Link>
            </div>
        </header>
    );
}
