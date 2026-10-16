'use client';

import { applyAvatarFallback, getPhotoUrl } from '@/lib/utils';

/**
 * Cache-buster for the full-size photo.
 *
 * In the browser it is fixed for the life of the loaded app: a new value on
 * every mount re-downloaded the photo each time a profile was opened, now it
 * downloads once per app session (a changed photo shows on the next app open).
 * On the server it stays per request, as before, so a directly opened profile
 * never gets an old cached copy.
 */
const SESSION_VERSION = Date.now();

function photoVersion() {
    return typeof window === 'undefined' ? Date.now() : SESSION_VERSION;
}

interface ProfileImageProps {
    userId: number;
    userName: string;
}

export function ProfileImage({ userId, userName }: ProfileImageProps) {
    return (
        <img
            src={`${getPhotoUrl(userId, 'large')}?v=${photoVersion()}`}
            // Server and browser versions differ on a first load; the
            // server's URL is kept, which is fine.
            suppressHydrationWarning
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
