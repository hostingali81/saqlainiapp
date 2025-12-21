import { getUserProfile } from '@/app/actions/user';
import { PaymentTimeline } from '@/components/PaymentTimeline';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatIndianCurrency } from '@/lib/utils';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ProfilePage({ params }: PageProps) {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) notFound();

    const result = await getUserProfile(userId);
    if ('error' in result) notFound();

    const { user, financials } = result;
    if (!user || !financials) notFound();

    // Check if image exists
    const fs = require('fs');
    const path = require('path');
    const hasLargeImage = fs.existsSync(path.join(process.cwd(), 'public', 'upload', 'large_image', `${user.id}.jpg`));

    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">

            {/* PROFILE HEADER - Exact PHP match + subtle glass */}
            <div className="glass-card rounded-[15px] p-6 mb-6 text-center relative">
                {/* Profile Image - PHP exact style */}
                {hasLargeImage ? (
                    <Image
                        src={`/upload/large_image/${user.id}.jpg`}
                        alt={user.name}
                        width={150}
                        height={150}
                        className="mx-auto mb-4 rounded-full object-cover"
                        style={{
                            border: '3px solid #C6A869',
                            padding: '3px',
                            background: '#FFF8E7'
                        }}
                    />
                ) : (
                    <Avatar
                        className="mx-auto mb-4"
                        style={{
                            width: '150px',
                            height: '150px',
                            border: '3px solid #C6A869',
                            background: '#FFF8E7'
                        }}
                    >
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=0D483B&size=300`} />
                        <AvatarFallback
                            style={{
                                background: 'rgba(255, 248, 231, 0.9)',
                                backdropFilter: 'blur(8px)'
                            }}
                        >
                            <UserIcon className="h-16 w-16" style={{ color: '#0D483B' }} />
                        </AvatarFallback>
                    </Avatar>
                )}

                {/* Profile Name - PHP style */}
                <h2
                    className="text-2xl font-bold mb-2"
                    style={{ color: '#4A3728' }}
                >
                    {user.name}
                </h2>

                {/* Profile Details - PHP style */}
                <div style={{ color: '#165E4B', fontSize: '1.1rem' }}>
                    <p className="mb-1"><strong>Father:</strong> {user.fname || 'N/A'}</p>
                    <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                </div>

                {/* Action Buttons - PHP exact style */}
                <div className="flex gap-4 justify-center mt-4 flex-col sm:flex-row">
                    {user.phone ? (
                        <a
                            href={`tel:${user.phone}`}
                            className="inline-flex items-center justify-center rounded-[25px] px-6 py-3 font-medium transition-all min-w-[140px] hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(198,168,105,0.3)]"
                            style={{
                                background: 'linear-gradient(135deg, #0D483B, #165E4B)',
                                color: '#FFF8E7',
                                border: '1px solid #C6A869',
                                textDecoration: 'none'
                            }}
                        >
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                        </a>
                    ) : null}
                    <WhatsAppButton user={user} financials={financials} />
                </div>
            </div>

            {/* STATS CONTAINER - PHP grid exact */}
            <div
                className="grid gap-4 mb-6"
                style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
                }}
            >
                <div className="glass-card rounded-[15px] p-4 text-center transition-transform hover:-translate-y-1">
                    <div
                        className="text-2xl font-bold mb-2"
                        style={{ color: '#0D483B' }}
                    >
                        {user.frequency === 'One Time' ? 'One Time' : user.frequency}
                    </div>
                    <div style={{ color: '#4A3728', fontSize: '0.9rem' }}>User Type</div>
                </div>
                <div className="glass-card rounded-[15px] p-4 text-center transition-transform hover:-translate-y-1">
                    <div
                        className={`text-2xl font-bold mb-2 ${financials.dueMonthsCount > 0 && user.frequency !== 'One Time'
                            ? 'text-red-600'
                            : 'text-green-600'
                            }`}
                    >
                        {user.frequency === 'One Time' ? '0' : financials.dueMonthsCount}
                    </div>
                    <div style={{ color: '#4A3728', fontSize: '0.9rem' }}>Due Months</div>
                </div>
            </div>

            {/* PAYMENT SUMMARY - PHP Style with Summary Boxes */}
            <div className="glass-card rounded-[15px] p-6 mb-6">
                {/* Title with bottom border */}
                <h3
                    className="text-xl font-bold mb-4 pb-2"
                    style={{
                        color: '#4A3728',
                        borderBottom: '2px solid #E5D3AA'
                    }}
                >
                    Payment Summary
                </h3>

                {/* Summary Boxes - PHP Style */}
                <div
                    className="rounded-[10px] p-4 mb-6 flex flex-wrap gap-4 justify-around"
                    style={{
                        background: 'rgba(229, 211, 170, 0.4)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(198, 168, 105, 0.3)'
                    }}
                >
                    {/* Total Paid */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm" style={{ color: '#4A3728' }}>Total Paid</div>
                        <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                            ₹{formatIndianCurrency(financials.totalPaid)}
                        </div>
                    </div>
                    {/* Paid Months */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm" style={{ color: '#4A3728' }}>Paid Months</div>
                        <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                            {financials.paidMonthsCount}
                        </div>
                    </div>
                    {/* Due Amount */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm" style={{ color: '#4A3728' }}>Due Amount</div>
                        <div className="text-xl font-bold text-red-600">
                            ₹{formatIndianCurrency(financials.dueMonthsCount * (user.amount || 125))}
                        </div>
                    </div>
                    {/* Average */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm" style={{ color: '#4A3728' }}>Avg Monthly</div>
                        <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                            ₹{formatIndianCurrency(Math.round(financials.avgMonthlyPayment))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT HISTORY List - PHP exact */}
            <div className="glass-card rounded-[15px] p-6">
                <h3
                    className="text-xl font-bold mb-4"
                    style={{ color: '#4A3728' }}
                >
                    Payment History
                </h3>

                <PaymentTimeline
                    history={financials.history}
                    frequency={user.frequency === 'One Time' ? 'Not Regular' : user.frequency}
                />
            </div>
        </main>
    );
}
