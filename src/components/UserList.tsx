'use client';

import { useState, useMemo } from 'react';
import { User } from '@/types';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UserListProps {
    initialUsers: User[];
}

export function UserList({ initialUsers }: UserListProps) {
    const [search, setSearch] = useState('');

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
                Showing {filteredUsers.length} members
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-24">
                {filteredUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                ))}
            </div>
        </div>
    );
}
