'use client';

import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

let cachedTotal: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60000; // 60 seconds

export function ClientHeader() {
    const [totalAmount, setTotalAmount] = useState<number | null>(cachedTotal);

    useEffect(() => {
        async function fetchTotal() {
            const now = Date.now();
            
            // Use cache if valid
            if (cachedTotal !== null && (now - cacheTime) < CACHE_DURATION) {
                setTotalAmount(cachedTotal);
                return;
            }

            const supabase = createClient();
            const { data, error } = await supabase.rpc('get_total_payment_amount');
            
            if (!error && data !== null) {
                cachedTotal = data;
                cacheTime = now;
                setTotalAmount(data);
            }
        }
        fetchTotal();
    }, []);

    return <Header totalAmount={totalAmount} />;
}
