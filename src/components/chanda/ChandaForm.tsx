'use client';

import { useEffect, useState } from 'react';
import { getChandaEntries, ChandaGroup, ChandaStats } from '@/app/actions/finance';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, IndianRupee, Users, ChartLine, Star, Info, FileDown } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

export function ChandaForm() {
    const [groups, setGroups] = useState<ChandaGroup[]>([]);
    const [stats, setStats] = useState<ChandaStats | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

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

    const exportToPDF = async () => {
        if (!confirm("Are you sure you want to download the PDF?")) return;

        try {
            setIsExporting(true);
            console.log('Starting PDF export with Hindi font support...');

            // Load fonts
            const fontURL = '/fonts/NotoSansDevanagari-Regular.ttf';
            const fontBoldURL = '/fonts/NotoSansDevanagari-Bold.ttf';

            const [resRegular, resBold] = await Promise.all([
                fetch(fontURL),
                fetch(fontBoldURL)
            ]);

            if (!resRegular.ok || !resBold.ok) {
                console.error('Font fetch failed:', resRegular.status, resBold.status);
                throw new Error(`Failed to fetch fonts: ${resRegular.status} ${resBold.status}`);
            }

            const [fontRegular, fontBold] = await Promise.all([
                resRegular.arrayBuffer(),
                resBold.arrayBuffer()
            ]);

            // Base64 conversion
            const fontBase64 = (buffer: ArrayBuffer) => {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return window.btoa(binary);
            };

            // Prepare new VFS entries
            const vfs = {
                "Hindi-Regular.ttf": fontBase64(fontRegular),
                "Hindi-Bold.ttf": fontBase64(fontBold)
            };

            // Define custom fonts configuration
            const customFonts = {
                NotoSans: {
                    normal: 'Hindi-Regular.ttf',
                    bold: 'Hindi-Bold.ttf',
                    italics: 'Hindi-Regular.ttf',
                    bolditalics: 'Hindi-Bold.ttf'
                }
            };

            console.log('VFS keys available:', Object.keys(vfs));

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                defaultStyle: {
                    font: 'NotoSans',
                    fontSize: 10,
                    color: '#4A3728'
                },
                content: [
                    {
                        text: 'Chanda Records',
                        style: 'header',
                        alignment: 'center',
                        margin: [0, 0, 0, 5]
                    },
                    {
                        text: `Generated: ${new Date().toLocaleDateString('en-GB')}`,
                        fontSize: 10,
                        color: '#666666',
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    },
                    ...(stats ? [{
                        columns: [
                            { text: `Total: ₹${formatIndianCurrency(stats.totalAmount)}`, style: 'stats' },
                            { text: `Donations: ${stats.totalDonations}`, style: 'stats' },
                            { text: `Average: ₹${formatIndianCurrency(Math.round(stats.avgAmount))}`, style: 'stats' },
                            { text: `Highest: ₹${formatIndianCurrency(stats.maxAmount)}`, style: 'stats' }
                        ],
                        margin: [0, 0, 0, 20]
                    }] : []),
                    {
                        table: {
                            headerRows: 1,
                            widths: [30, '*', 80, 70, 120],
                            body: [
                                [
                                    { text: 'Sr.', style: 'tableHeader' },
                                    { text: 'Name', style: 'tableHeader' },
                                    { text: 'Amount', style: 'tableHeader', alignment: 'right' },
                                    { text: 'Last Date', style: 'tableHeader', alignment: 'center' },
                                    { text: 'Remarks', style: 'tableHeader' }
                                ],
                                // Sort groups by totalAmount descending (highest first)
                                ...[...groups].sort((a, b) => b.totalAmount - a.totalAmount).map((group, index) => [
                                    { text: (index + 1).toString(), alignment: 'center' },
                                    { text: group.name },
                                    {
                                        stack: [
                                            { text: `₹${formatIndianCurrency(group.totalAmount)}`, bold: true, color: '#059669', fontSize: 11 },
                                            ...group.donations.map(d => ({
                                                text: `  ₹${formatIndianCurrency(d.Amount)} (${d.Date})`,
                                                fontSize: 7,
                                                color: '#666666',
                                                margin: [0, 0.5, 0, 0] as [number, number, number, number]
                                            }))
                                        ],
                                        alignment: 'right',
                                        unbreakable: true
                                    },
                                    { text: group.latestDate, alignment: 'center' },
                                    { text: group.latestRemarks || '-' }
                                ])
                            ],
                            dontBreakRows: true
                        },
                        layout: {
                            fillColor: (rowIndex: number) => rowIndex === 0 ? '#E5D3AA' : (rowIndex % 2 === 0 ? '#FFF8E7' : null),
                            hLineColor: () => '#C6A869',
                            vLineColor: () => '#C6A869'
                        }
                    }
                ],
                styles: {
                    header: {
                        fontSize: 22,
                        bold: true,
                        color: '#0D483B'
                    },
                    stats: {
                        fontSize: 11,
                        bold: true,
                        color: '#4A3728'
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 11,
                        color: '#4A3728'
                    }
                },
                footer: (currentPage: number, pageCount: number) => ({
                    text: `Page ${currentPage} of ${pageCount}`,
                    alignment: 'center',
                    fontSize: 9,
                    color: '#999999',
                    margin: [0, 10, 0, 0]
                })
            };

            // CRITICAL: Pass VFS and fonts directly to createPdf
            // Signature: createPdf(docDefinition, tableLayouts, fonts, vfs)
            (pdfMake as any).createPdf(docDefinition, null, customFonts, vfs).download(
                `Chanda_Records_${new Date().toISOString().split('T')[0]}.pdf`,
                () => setIsExporting(false) // Callback when done
            );

        } catch (error) {
            console.error('Error generating PDF with Hindi fonts:', error);

            // Fallback to default fonts
            try {
                // Reset to default VFS (best effort)
                (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || (pdfMake as any).vfs || pdfFonts;

                const fallbackDocDef: any = {
                    pageSize: 'A4',
                    pageMargins: [40, 60, 40, 60],
                    defaultStyle: {
                        fontSize: 10,
                        color: '#4A3728'
                    },
                    content: [
                        { text: 'Chanda Records', style: 'header', alignment: 'center', margin: [0, 0, 0, 5] },
                        {
                            text: 'Warning: Failed to load Hindi fonts. Some characters may not display correctly.',
                            color: 'red',
                            fontSize: 10,
                            alignment: 'center',
                            margin: [0, 0, 0, 20]
                        },
                        {
                            table: {
                                headerRows: 1,
                                widths: [30, '*', 80, 70, 120],
                                body: [
                                    [
                                        { text: 'Sr.', style: 'tableHeader' },
                                        { text: 'Name', style: 'tableHeader' },
                                        { text: 'Amount', style: 'tableHeader', alignment: 'right' },
                                        { text: 'Last Date', style: 'tableHeader', alignment: 'center' },
                                        { text: 'Remarks', style: 'tableHeader' }
                                    ],
                                    ...groups.map((group, index) => [
                                        { text: (index + 1).toString(), alignment: 'center' },
                                        { text: group.name },
                                        { text: `₹${formatIndianCurrency(group.totalAmount)}`, alignment: 'right', bold: true, color: '#059669' },
                                        { text: group.latestDate, alignment: 'center' },
                                        { text: group.latestRemarks || '-' }
                                    ])
                                ]
                            },
                            layout: {
                                fillColor: (rowIndex: number) => rowIndex === 0 ? '#E5D3AA' : (rowIndex % 2 === 0 ? '#FFF8E7' : null),
                                hLineColor: () => '#C6A869',
                                vLineColor: () => '#C6A869'
                            }
                        }
                    ],
                    styles: {
                        header: { fontSize: 22, bold: true, color: '#0D483B' },
                        tableHeader: { bold: true, fontSize: 11, color: '#4A3728' }
                    }
                };

                alert('Could not load Hindi fonts. Downloading version with default fonts (Hindi text may be broken).');
                (pdfMake as any).createPdf(fallbackDocDef).download(
                    `Chanda_Records_Fallback_${new Date().toISOString().split('T')[0]}.pdf`,
                    () => setIsExporting(false) // Callback
                );

            } catch (fallbackError) {
                console.error('Even fallback failed', fallbackError);
                alert('Failed to generate PDF. Please check console.');
                setIsExporting(false);
            }
        }
    };

    return (
        <main className="max-w-[800px] mx-auto p-6 pb-24">
            {/* Title & Export Button */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: '#0D483B' }}>Chanda Records</h1>
                <Button
                    onClick={exportToPDF}
                    disabled={loading || groups.length === 0 || isExporting}
                    className="rounded-[15px]"
                    style={{
                        background: 'linear-gradient(135deg, #0D483B, #165E4B)',
                        color: '#FFF8E7'
                    }}
                >
                    <FileDown className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
                    {isExporting ? 'Generating...' : 'Export PDF'}
                </Button>
            </div>

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
                    {stats ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="h-5 w-5 rounded-full" style={{ background: 'rgba(198, 168, 105, 0.2)' }} />
                                    <div className="h-6 w-16 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                        <div className="absolute inset-0" style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                            backgroundSize: '200% 100%',
                                            animation: 'shimmer 1.5s infinite linear'
                                        }} />
                                    </div>
                                    <div className="h-3 w-12 rounded" style={{ background: 'rgba(198, 168, 105, 0.1)' }} />
                                </div>
                            ))}
                        </>
                    )}
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
                                <>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} style={{ borderBottom: '1px solid #E5D3AA' }}>
                                            <td className="p-3">
                                                <div className="h-3 w-6 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                                    <div className="absolute inset-0" style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 1.5s infinite linear'
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="h-4 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                                    <div className="absolute inset-0" style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 1.5s infinite linear'
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="h-4 w-20 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                                                    <div className="absolute inset-0" style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 1.5s infinite linear'
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="h-3 w-16 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                                                    <div className="absolute inset-0" style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 1.5s infinite linear'
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="h-3 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                                                    <div className="absolute inset-0" style={{
                                                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                                                        backgroundSize: '200% 100%',
                                                        animation: 'shimmer 1.5s infinite linear'
                                                    }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
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
                                                            <TooltipContent className="max-w-[320px] p-4">
                                                                <div className="space-y-3">
                                                                    <p className="font-bold border-b pb-2 mb-2 text-sm">History ({group.count})</p>
                                                                    {group.donations.map((d, i) => (
                                                                        <div key={i} className="text-xs space-y-1.5 pb-2 border-b border-dashed last:border-0">
                                                                            <div className="flex justify-between items-center gap-4 font-medium">
                                                                                <span className="font-bold text-sm">₹{formatIndianCurrency(d.Amount)}</span>
                                                                                <span className="text-muted-foreground text-[11px] whitespace-nowrap">{d.Date}</span>
                                                                            </div>
                                                                            {d.Remarks && (
                                                                                <div className="text-muted-foreground italic text-[11px] pt-1">
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
    );
}
