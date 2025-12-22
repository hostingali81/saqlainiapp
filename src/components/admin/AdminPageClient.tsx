'use client';

import { useState } from 'react';
import { User } from '@/types';
import { SmartEntryForm } from '@/components/SmartEntryForm';
import { PaymentEntriesTable } from '@/components/PaymentEntriesTable';

export function AdminPageClient({ users }: { users: User[] }) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handlePaymentSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <>
            <SmartEntryForm users={users} onPaymentSuccess={handlePaymentSuccess} />
            <PaymentEntriesTable refreshTrigger={refreshTrigger} />
        </>
    );
}
