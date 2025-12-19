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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
            style={{
                background: 'rgba(13, 72, 59, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
            onClick={onClose}
        >
            {/* Close Button with glass effect */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 h-12 w-12 rounded-full smooth-hover z-10"
                style={{
                    background: 'rgba(198, 168, 105, 0.2)',
                    backdropFilter: 'blur(8px)',
                    border: '2px solid rgba(198, 168, 105, 0.4)',
                    color: '#FFF8E7'
                }}
                onClick={onClose}
            >
                <X className="h-6 w-6" />
            </Button>

            {/* Image Container with glass border */}
            <div
                className="relative max-w-3xl max-h-[85vh] w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glass Frame */}
                <div
                    className="relative p-2 rounded-2xl"
                    style={{
                        background: 'rgba(255, 248, 231, 0.1)',
                        backdropFilter: 'blur(20px)',
                        border: '3px solid rgba(198, 168, 105, 0.5)',
                        boxShadow: `
                            0 0 40px rgba(198, 168, 105, 0.3),
                            0 0 80px rgba(198, 168, 105, 0.1),
                            0 8px 32px rgba(13, 72, 59, 0.4)
                        `
                    }}
                >
                    {/* Actual Image with golden glow */}
                    <img
                        src={imageUrl}
                        alt={userName}
                        className="w-full h-auto rounded-xl object-contain max-h-[80vh] transition-opacity duration-300"
                        style={{
                            boxShadow: '0 0 50px rgba(198, 168, 105, 0.4)'
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setHasError(true);
                            setIsLoading(false);
                        }}
                    />

                    {/* Error State with glass */}
                    {hasError && (
                        <div
                            className="absolute inset-2 flex items-center justify-center rounded-xl"
                            style={{
                                background: 'rgba(255, 248, 231, 0.3)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <div className="text-center" style={{ color: '#FFF8E7' }}>
                                <p className="text-lg font-bold mb-2">⚠️</p>
                                <p>Failed to load image</p>
                            </div>
                        </div>
                    )}

                    {/* User Name Label with glass */}
                    {!isLoading && !hasError && (
                        <div
                            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-full"
                            style={{
                                background: 'rgba(13, 72, 59, 0.85)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(198, 168, 105, 0.5)',
                                color: '#FFF8E7',
                                boxShadow: '0 4px 12px rgba(198, 168, 105, 0.3)'
                            }}
                        >
                            <p className="font-bold text-sm">{userName}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
