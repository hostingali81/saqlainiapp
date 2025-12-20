'use client';

import { useState, useMemo, useEffect } from 'react';
import { User } from '@/types';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UserListProps {
    initialUsers: User[];
}

function UserCardSkeleton() {
    return (
        <div className="p-2">
            <div className="glass-card rounded-[15px] p-4 flex items-center gap-3 relative overflow-hidden">
                <div className="h-[50px] w-[50px] rounded-full relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                    <div className="h-3 w-24 rounded relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                </div>
                <div className="h-7 w-12 rounded-full relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
                <div className="h-[45px] w-[45px] rounded-full relative overflow-hidden" style={{ background: 'rgba(198, 168, 105, 0.15)' }}>
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                    }} />
                </div>
            </div>
        </div>
    );
}

export function UserList({ initialUsers }: UserListProps) {
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    const filteredUsers = useMemo(() => {
        if (!search) return initialUsers;
        const lowerSearch = search.toLowerCase();
        return initialUsers.filter(user =>
            user.name.toLowerCase().includes(lowerSearch) ||
            user.fname?.toLowerCase().includes(lowerSearch) ||
            user.phone?.includes(lowerSearch)
        );
    }, [initialUsers, search]);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, father's name, or phone..."
                    className="pl-10 bg-white shadow-sm border-accent/50 focus:border-primary focus:ring-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div className="text-sm text-muted-foreground px-1">
                {isLoading ? (
                    <div className="h-4 w-32 rounded relative overflow-hidden inline-block" style={{ background: 'rgba(198, 168, 105, 0.1)' }}>
                        <div className="absolute inset-0" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.3), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite linear'
                        }} />
                    </div>
                ) : (
                    `Showing ${filteredUsers.length} members`
                )}
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-24">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <UserCardSkeleton key={i} />)
                ) : (
                    filteredUsers.map((user) => (
                        <UserCard key={user.id} user={user} />
                    ))
                )}
            </div>
        </div>
    );
}
