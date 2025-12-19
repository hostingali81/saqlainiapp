'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    userName: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, userName }: ImageModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsLoading(true);
            setHasError(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{
                background: 'rgba(255, 248, 231, 0.6)', // More transparent
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={onClose}
        >
            {/* Image Container - Theme matching */}
            <div
                className="relative max-w-4xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Positioned near image */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-10 w-10 rounded-full z-10 transition-all"
                    style={{
                        background: 'rgba(198, 168, 105, 0.25)',
                        backdropFilter: 'blur(8px)',
                        color: '#145948',
                        border: '1px solid rgba(198, 168, 105, 0.4)'
                    }}
                    onClick={onClose}
                >
                    <X className="h-5 w-5" />
                </Button>

                {/* Frame with glass effect */}
                <div
                    className="relative rounded-2xl overflow-hidden p-3"
                    style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '2px solid rgba(198, 168, 105, 0.5)',
                        boxShadow: `
                            0 20px 60px rgba(198, 168, 105, 0.3),
                            0 0 0 1px rgba(198, 168, 105, 0.2) inset
                        `
                    }}
                >
                    {/* Skeleton Loader */}
                    {isLoading && !hasError && (
                        <div className="w-full aspect-square rounded-xl relative overflow-hidden" style={{
                            background: 'rgba(198, 168, 105, 0.1)'
                        }}>
                            <div className="absolute inset-0" style={{
                                background: 'linear-gradient(90deg, transparent, rgba(198, 168, 105, 0.2), transparent)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite linear'
                            }} />
                        </div>
                    )}

                    {/* Actual Image with golden border */}
                    <img
                        src={imageUrl}
                        alt={userName}
                        className={`w-full h-auto object-contain max-h-[85vh] rounded-lg transition-opacity duration-300 ${isLoading ? 'hidden' : 'block'}`}
                        style={{
                            border: '3px solid #C6A869',
                            boxShadow: '0 0 30px rgba(198, 168, 105, 0.5)'
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setHasError(true);
                            setIsLoading(false);
                        }}
                    />

                    {/* Error State */}
                    {hasError && (
                        <div
                            className="absolute inset-0 flex items-center justify-center rounded-xl"
                            style={{
                                background: 'rgba(255, 248, 231, 0.95)',
                            }}
                        >
                            <div className="text-center" style={{ color: '#145948' }}>
                                <p className="text-4xl mb-2">⚠️</p>
                                <p className="text-lg font-semibold">Failed to load image</p>
                            </div>
                        </div>
                    )}

                    {/* User Name Badge - Theme colors */}
                    {!isLoading && !hasError && (
                        <div
                            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full"
                            style={{
                                background: '#145948',
                                border: '1px solid #C6A869',
                                color: '#FFF8E7',
                                boxShadow: '0 4px 12px rgba(198, 168, 105, 0.4)'
                            }}
                        >
                            <p className="font-semibold text-sm">{userName}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
