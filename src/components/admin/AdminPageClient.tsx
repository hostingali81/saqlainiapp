'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { SmartEntryForm } from '@/components/SmartEntryForm';
import { PaymentEntriesTable } from '@/components/PaymentEntriesTable';

export function AdminPageClient({ users }: { users: User[] }) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const router = useRouter();

    const handlePaymentSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        // `users` (and each user's bakaya_month) comes from the server component.
        // Without this the "X Due" figures stayed stale until a manual reload.
        router.refresh();
    };

    return (
        <>
            <SmartEntryForm users={users} onPaymentSuccess={handlePaymentSuccess} />
            {/* Editing or deleting an entry re-syncs members' due months too. */}
            <PaymentEntriesTable refreshTrigger={refreshTrigger} onDataChanged={() => router.refresh()} />
        </>
    );
}
