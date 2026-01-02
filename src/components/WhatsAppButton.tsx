'use client';

import { User, UserFinancialSummary } from '@/types';

interface WhatsAppButtonProps {
    user: User;
    financials: UserFinancialSummary;
}

export function WhatsAppButton({ user, financials }: WhatsAppButtonProps) {
    if (!user.phone) return null;

    const dueAmount = financials.dueMonthsCount * (user.amount || 125);
    const avgPayment = financials.paidMonthsCount > 0 ? (financials.totalPaid / financials.paidMonthsCount).toFixed(2) : '0.00';

    // Exact Hindi Message from Legacy profile.php
    let message = `जनाब *_${user.name.trim()}_* साहब,\n\n`;
    message += `*${String.fromCodePoint(0x1F4B0)} आपकी अदायगी की तफ्सीलात (Payment Details):* \n`;
    message += `अब तक कुल जमा रकम: *₹${financials.totalPaid.toLocaleString('en-IN')}*\n`;
    message += `हर महीने की जमा एवरेज रकम: *₹${avgPayment}*\n\n`;

    if (financials.dueMonthsCount > 0 && user.frequency !== 'One Time') {
        message += `*${String.fromCodePoint(0x26A0, 0xFE0F)} बकाया तफ्सीलात (Due Details):*\n`;
        message += `कुल बकाया महीने: *${financials.dueMonthsCount}*\n`;
        message += `कम से कम बकाया रकम: *₹${dueAmount.toLocaleString('en-IN')}*\n\n`;
        message += `_मेहरबानी करके जल्द से जल्द अपना बकाया रकम जमा करें।_ ${String.fromCodePoint(0x1F64F)}`;
    } else {
        message += `*${String.fromCodePoint(0x2705, 0x1F389)} आपके सभी महीनो का पेमेंट अप टू डेट हैं, शुक्रिया!*`;
    }

    message += `\n\n*सादर,* ${String.fromCodePoint(0x1F54C)}\n*सकलैनी मस्जिद केसरपुर*`;

    // Phone number logic: strip non-digits, ensure it starts with 91
    let cleanPhone = user.phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('91')) {
        cleanPhone = '91' + cleanPhone;
    }

    // Switch to api.whatsapp.com to prevent redirect encoding issues
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    return (
        <a
            href={url}
            target="_blank"
            className="inline-flex items-center justify-center rounded-[25px] px-6 py-3 font-medium transition-all min-w-[140px] cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(37,211,102,0.3)]"
            style={{
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#FFF8E7',
                border: '1px solid #C6A869',
                textDecoration: 'none'
            }}
        >
            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
        </a>
    );
}
