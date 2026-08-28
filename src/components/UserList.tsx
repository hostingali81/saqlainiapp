'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { User } from '@/types';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UserListProps {
    initialUsers: User[];
}

/**
 * The list scrolls inside its own `overflow-y-auto` container rather than the
 * window, and Next's built-in scroll restoration only ever restores the window.
 * On top of that the page is `force-dynamic` with the router cache disabled, so
 * coming back from a profile remounts this component from scratch. Both add up
 * to the list always snapping back to the top.
 *
 * So the view is remembered here instead: scroll offset *and* the active search,
 * per browser tab.
 */
const SCROLL_KEY = 'memberList:scroll';
const SEARCH_KEY = 'memberList:search';

// sessionStorage throws in some privacy modes - never let that break the list.
function readStored(key: string): string | null {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStored(key: string, value: string) {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        /* ignore */
    }
}

export function UserList({ initialUsers }: UserListProps) {
    const [search, setSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Restoring during render would not match the server HTML, so it happens
    // after mount; this tick guarantees one render in between.
    const [restoreTick, setRestoreTick] = useState(0);
    const pendingScrollRef = useRef(0);
    const restoredRef = useRef(false);
    const saveFrameRef = useRef<number | null>(null);

    const filteredUsers = useMemo(() => {
        if (!search) return initialUsers;
        const lowerSearch = search.toLowerCase();
        return initialUsers.filter(user =>
            user.name.toLowerCase().includes(lowerSearch) ||
            user.fname?.toLowerCase().includes(lowerSearch) ||
            user.phone?.includes(lowerSearch)
        );
    }, [initialUsers, search]);

    // 1. Pull the remembered view out of storage once mounted.
    useEffect(() => {
        pendingScrollRef.current = Number(readStored(SCROLL_KEY)) || 0;
        setSearch(readStored(SEARCH_KEY) || '');
        setRestoreTick(t => t + 1);
    }, []);

    // 2. Apply it after the filtered list has actually been committed, so the
    //    container is already its full height when scrollTop is set.
    useLayoutEffect(() => {
        if (restoreTick === 0 || restoredRef.current) return;
        restoredRef.current = true;

        const el = scrollRef.current;
        if (el && pendingScrollRef.current > 0) {
            el.scrollTop = pendingScrollRef.current;
        }
    }, [restoreTick]);

    // 3. Keep the stored search in step (only after restoring, or the first
    //    render would overwrite it with an empty string).
    useEffect(() => {
        if (!restoredRef.current) return;
        writeStored(SEARCH_KEY, search);
    }, [search]);

    // Throttle to one write per frame - this fires on every scroll event.
    const handleScroll = () => {
        if (saveFrameRef.current !== null) return;
        saveFrameRef.current = requestAnimationFrame(() => {
            saveFrameRef.current = null;
            const el = scrollRef.current;
            if (el) writeStored(SCROLL_KEY, String(el.scrollTop));
        });
    };

    useEffect(() => () => {
        if (saveFrameRef.current !== null) cancelAnimationFrame(saveFrameRef.current);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        // A different filter makes the old offset meaningless.
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        writeStored(SCROLL_KEY, '0');
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, father's name, or phone..."
                    className="pl-10 bg-white shadow-sm border-accent/50 focus:border-primary focus:ring-primary"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div className="text-sm text-muted-foreground px-1">
                Showing {filteredUsers.length} members
            </div>

            {/* User List */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto space-y-2 pb-24"
            >
                {filteredUsers.map((user, index) => (
                    <UserCard key={user.id} user={user} index={index} />
                ))}
            </div>
        </div>
    );
}
