'use client';

import { useState } from 'react';
import { User, MonthStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { processSmartPayment } from '@/app/actions/user';
import { Check } from 'lucide-react';

interface SmartEntryFormProps {
    users: User[];
}

export function SmartEntryForm({ users }: SmartEntryFormProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; allocated?: any[]; error?: string } | null>(null);

    const selectedUser = users.find(u => u.id.toString() === selectedUserId);

    // Convert users to options format
    const userOptions = users.map(u => ({
        value: u.id.toString(),
        label: `${u.name} (${u.bakaya_month} Due)`
    }));

    const handlePayment = async () => {
        if (!selectedUserId || !amount) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await processSmartPayment(parseInt(selectedUserId), parseInt(amount));
            setResult(res);
            if (res.success) {
                setAmount(''); // Reset amount on success
            }
        } catch (e) {
            setResult({ error: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg mx-auto border-t-4 border-t-secondary">
            <CardHeader>
                <CardTitle>Payment Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Searchable User Select */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select User</label>
                    <SearchableSelect
                        options={userOptions}
                        value={selectedUserId}
                        onChange={(value) => {
                            setSelectedUserId(value);
                            setResult(null);
                        }}
                        placeholder="Search and select user..."
                    />
                </div>

                {/* Info Box */}
                {selectedUser && (
                    <div className="bg-muted p-3 rounded-md text-sm grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-muted-foreground">Total Due Months:</span>
                            <p className="font-bold text-red-600">{selectedUser.bakaya_month}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Total Amount:</span>
                            <p className="font-bold text-red-600">₹{selectedUser.bakaya_month * (selectedUser.amount || 125)}</p>
                        </div>
                    </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Paid Amount (₹)</label>
                    <Input
                        type="number"
                        placeholder="e.g. 500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    {amount && (
                        <p className="text-xs text-muted-foreground">
                            Will clear approx <strong>{Math.floor(parseInt(amount) / 125)}</strong> months.
                        </p>
                    )}
                </div>

                {/* Action Button */}
                <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={!selectedUserId || !amount || loading}
                    onClick={handlePayment}
                >
                    {loading ? 'Processing...' : (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Auto-Allocate Payment
                        </>
                    )}
                </Button>

                {/* Result */}
                {result && (
                    <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.error ? (
                            <p>Error: {result.error}</p>
                        ) : (
                            <div>
                                <p className="font-bold">Success! Payment Allocated:</p>
                                <ul className="list-disc list-inside mt-1">
                                    {result.allocated?.map((a, i) => (
                                        <li key={i}>{a.year}-{a.month}: ₹{a.amount}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
