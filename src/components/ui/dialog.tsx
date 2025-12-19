'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface SimpleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: SimpleDialogProps) {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

export function DialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 ${className}`}>
            {children}
        </div>
    );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}
