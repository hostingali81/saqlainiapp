'use client';

import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ClientHeader() {
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        async function fetchTotal() {
            const supabase = createClient();
            const { data } = await supabase.from('payment').select('amount');
            const total = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
            setTotalAmount(total);
        }
        fetchTotal();
    }, []);

    return <Header totalAmount={totalAmount} />;
}
