'use client';

import { useEffect, useState } from 'react';
import { getChandaEntries, ChandaGroup, ChandaStats } from '@/app/actions/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, IndianRupee, Users, ChartLine, Star, Info } from 'lucide-react';
import { ClientHeader } from '@/components/ClientHeader';
import { formatIndianCurrency } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ChandaPage() {
    const [groups, setGroups] = useState<ChandaGroup[]>([]);
    const [stats, setStats] = useState<ChandaStats>({ totalAmount: 0, totalDonations: 0, avgAmount: 0, maxAmount: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadData = async (searchTerm: string) => {
        setLoading(true);
        const { groups: groupData, stats: statsData } = await getChandaEntries(searchTerm);
        setGroups(groupData);
        setStats(statsData);
        setLoading(false);
    };

    return (
        <>
            <ClientHeader />
            <main className="max-w-[800px] mx-auto p-6 pb-24">
                {/* Title */}
                <h1 className="text-2xl font-bold mb-6" style={{ color: '#0D483B' }}>Chanda Records</h1>

                {/* STATS SUMMARY - PHP Style */}
                <div
                    className="rounded-[15px] p-6 mb-6"
                    style={{
                        background: '#FFF8E7',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid #E5D3AA'
                    }}
                >
                    <h3
                        className="text-xl font-bold mb-4 pb-2"
                        style={{
                            color: '#4A3728',
                            borderBottom: '2px solid #E5D3AA'
                        }}
                    >
                        Chanda Summary
                    </h3>

                    {/* Summary Boxes */}
                    <div
                        className="rounded-[10px] p-4 flex flex-wrap gap-4 justify-around"
                        style={{ background: '#E5D3AA' }}
                    >
                        <div className="flex flex-col items-center">
                            <IndianRupee className="h-5 w-5 mb-1" style={{ color: '#0D483B' }} />
                            <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                ₹{formatIndianCurrency(stats.totalAmount)}
                            </div>
                            <div className="text-xs" style={{ color: '#4A3728' }}>Total Amount</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Users className="h-5 w-5 mb-1" style={{ color: '#0D483B' }} />
                            <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                {stats.totalDonations}
                            </div>
                            <div className="text-xs" style={{ color: '#4A3728' }}>Donations</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <ChartLine className="h-5 w-5 mb-1" style={{ color: '#0D483B' }} />
                            <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                ₹{formatIndianCurrency(Math.round(stats.avgAmount))}
                            </div>
                            <div className="text-xs" style={{ color: '#4A3728' }}>Average</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <Star className="h-5 w-5 mb-1" style={{ color: '#C6A869' }} />
                            <div className="text-xl font-bold" style={{ color: '#0D483B' }}>
                                ₹{formatIndianCurrency(stats.maxAmount)}
                            </div>
                            <div className="text-xs" style={{ color: '#4A3728' }}>Highest</div>
                        </div>
                    </div>
                </div>

                {/* SEARCH - PHP Style */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#165E4B' }} />
                    <Input
                        placeholder="Search by name or remarks..."
                        className="pl-11 py-3 rounded-[15px]"
                        style={{
                            background: '#FFF8E7',
                            border: '1px solid #E5D3AA',
                            color: '#0D483B'
                        }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* RECORDS TABLE - PHP Style */}
                <div
                    className="rounded-[15px] overflow-hidden"
                    style={{
                        background: '#FFF8E7',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid #E5D3AA'
                    }}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: '#E5D3AA' }}>
                                    <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Sr.</th>
                                    <th className="text-left p-3 text-sm font-bold w-[40%]" style={{ color: '#4A3728' }}>Name</th>
                                    <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Amount</th>
                                    <th className="text-left p-3 text-sm font-bold whitespace-nowrap" style={{ color: '#4A3728' }}>Last Date</th>
                                    <th className="text-left p-3 text-sm font-bold" style={{ color: '#4A3728' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8" style={{ color: '#165E4B' }}>Loading...</td>
                                    </tr>
                                ) : groups.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8" style={{ color: '#165E4B' }}>No records found.</td>
                                    </tr>
                                ) : (
                                    groups.map((group, index) => (
                                        <tr
                                            key={index}
                                            style={{
                                                borderBottom: index < groups.length - 1 ? '1px solid #E5D3AA' : 'none',
                                                background: index % 2 === 0 ? 'transparent' : 'rgba(229, 211, 170, 0.1)'
                                            }}
                                        >
                                            <td className="p-3 text-xs font-mono" style={{ color: '#165E4B' }}>{index + 1}</td>
                                            <td className="p-3" style={{ color: '#4A3728' }}>
                                                {group.name.includes('/') ? (
                                                    <div>
                                                        <div className="font-bold text-base leading-tight">{group.name.split('/')[0].trim()}</div>
                                                        <div className="text-xs text-[#8B7355] mt-1 font-medium">{group.name.split('/').slice(1).join(' / ').trim()}</div>
                                                    </div>
                                                ) : (
                                                    <div className="font-bold text-base">{group.name}</div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold" style={{ color: '#059669' }}>
                                                        ₹{formatIndianCurrency(group.totalAmount)}
                                                    </span>
                                                    {group.count > 1 && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Info className="h-4 w-4 cursor-pointer" style={{ color: '#0D483B' }} />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-[280px] p-3">
                                                                    <div className="space-y-2">
                                                                        <p className="font-bold border-b pb-1 mb-2">History ({group.count})</p>
                                                                        {group.donations.map((d, i) => (
                                                                            <div key={i} className="text-xs space-y-1">
                                                                                <div className="flex justify-between font-medium">
                                                                                    <span>₹{formatIndianCurrency(d.Amount)}</span>
                                                                                    <span className="text-muted-foreground">{d.Date}</span>
                                                                                </div>
                                                                                {d.Remarks && (
                                                                                    <div className="text-muted-foreground italic text-[11px] border-t pt-1 border-dashed">
                                                                                        {d.Remarks}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-xs whitespace-nowrap" style={{ color: '#165E4B' }}>{group.latestDate}</td>
                                            <td className="p-3 text-xs" style={{ color: '#165E4B' }}>
                                                {group.latestRemarks.length > 50
                                                    ? group.latestRemarks.slice(0, 50) + '...'
                                                    : group.latestRemarks}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </>
    );
}
