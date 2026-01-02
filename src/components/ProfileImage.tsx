'use client';

import { getPhotoUrl } from '@/lib/utils';

interface ProfileImageProps {
    userId: number;
    userName: string;
}

export function ProfileImage({ userId, userName }: ProfileImageProps) {
    return (
        <img
            src={`${getPhotoUrl(userId, 'large')}?v=${Date.now()}`}
            alt={userName}
            className="mx-auto mb-4 rounded-full object-cover"
            style={{
                border: '3px solid #C6A869',
                padding: '3px',
                background: '#FFF8E7',
                width: '150px',
                height: '150px'
            }}
            onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&bold=true&color=0D483B&size=300`;
            }}
        />
    );
}
