'use client';

import { useMemo } from 'react';
import { applyAvatarFallback, getPhotoUrl } from '@/lib/utils';

interface ProfileImageProps {
    userId: number;
    userName: string;
}

export function ProfileImage({ userId, userName }: ProfileImageProps) {
    // Calling Date.now() during render gave the server and the client different
    // URLs (a hydration mismatch) and re-downloaded the photo on every render.
    // One value per mount still busts the cache on a page reload.
    const version = useMemo(() => Date.now(), []);

    return (
        <img
            src={`${getPhotoUrl(userId, 'large')}?v=${version}`}
            alt={userName}
            className="mx-auto mb-4 rounded-full object-cover"
            style={{
                border: '3px solid #C6A869',
                padding: '3px',
                background: '#FFF8E7',
                width: '150px',
                height: '150px'
            }}
            onError={(e) => applyAvatarFallback(e.currentTarget, userName, 300)}
        />
    );
}
