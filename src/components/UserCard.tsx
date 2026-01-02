'use client';

import { User } from '@/types';
import { Phone, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { cn, getPhotoUrl } from '@/lib/utils';
import { ImageModal } from './ImageModal';

interface UserCardProps {
    user: User;
    style?: React.CSSProperties;
}

export function UserCard({ user, style }: UserCardProps) {
    const isDue = user.bakaya_month > 0;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isPriority = user.id <= 10;

    const handleImageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const largeImageUrl = user.hasImage
        ? getPhotoUrl(user.id, 'large')
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=0D483B&size=300`;

    return (
        <>
            <div style={style} className="p-2">
                <Link href={`/profile/${user.id}`} prefetch={true}>
                    {/* GLASSMORPHISM CARD */}
                    <div className="glass-card rounded-[15px] p-4 flex items-center gap-3 relative overflow-hidden">
                        {/* Decorative emoji with float animation */}
                        <div
                            className="absolute -top-[5px] -right-[5px] text-[20px] rotate-45 float-animation"
                            style={{ opacity: 0.5 }}
                        >
                            ☘️
                        </div>

                        {/* Avatar with glass effect */}
                        <div className="relative cursor-pointer flex-shrink-0" onClick={handleImageClick}>
                            {user.hasImage ? (
                                <Image
                                    src={getPhotoUrl(user.id, 'small')}
                                    alt={user.name}
                                    width={50}
                                    height={50}
                                    className="h-[50px] w-[50px] rounded-full object-cover glass-avatar"
                                    priority={isPriority}
                                />
                            ) : (
                                <Avatar className="h-[50px] w-[50px] glass-avatar">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=0D483B`} />
                                    <AvatarFallback
                                        style={{
                                            background: 'rgba(255, 248, 231, 0.9)',
                                            backdropFilter: 'blur(8px)'
                                        }}
                                    >
                                        <UserIcon className="h-6 w-6" style={{ color: '#0D483B' }} />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                            <h3
                                className="font-bold text-base mb-1 truncate"
                                style={{ color: '#4A3728' }}
                            >
                                {user.name}
                            </h3>
                            <p
                                className="text-[0.9rem] truncate"
                                style={{ color: '#165E4B' }}
                            >
                                {user.fname || 'N/A'}
                            </p>
                        </div>

                        {/* Due Badge with glass effect */}
                        <div
                            className="px-3 py-1 rounded-full min-w-[2rem] text-center text-[0.9rem] font-bold text-white flex-shrink-0 gold-glow"
                            style={{
                                background: isDue
                                    ? 'linear-gradient(135deg, rgba(13, 72, 59, 0.9), rgba(22, 94, 75, 0.9))'
                                    : 'linear-gradient(135deg, rgba(45, 106, 79, 0.9), rgba(52, 121, 88, 0.9))',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(198, 168, 105, 0.4)'
                            }}
                        >
                            {user.bakaya_month}
                        </div>

                        {/* Call Button with glass + glow */}
                        <div onClick={(e) => e.preventDefault()} className="flex-shrink-0">
                            {user.phone ? (
                                <Button
                                    size="icon"
                                    className="h-[45px] w-[45px] rounded-full smooth-hover gold-glow"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(13, 72, 59, 0.95), rgba(22, 94, 75, 0.95))',
                                        backdropFilter: 'blur(8px)',
                                        border: '2px solid rgba(198, 168, 105, 0.5)',
                                        color: '#FFF8E7'
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.location.href = `tel:+91${user.phone?.replace(/\D/g, '') || ''}`;
                                    }}
                                >
                                    <Phone className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button
                                    disabled
                                    size="icon"
                                    className="h-[45px] w-[45px] rounded-full"
                                    style={{
                                        background: 'rgba(200, 200, 200, 0.5)',
                                        backdropFilter: 'blur(8px)',
                                        color: '#999'
                                    }}
                                >
                                    <Phone className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </Link>
            </div>

            <ImageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                imageUrl={largeImageUrl}
                userName={user.name}
            />
        </>
    );
}
