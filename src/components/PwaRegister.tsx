'use client';

import { useEffect } from 'react';

/**
 * Makes the installed app behave like an app rather than a web page. Renders
 * nothing. Everything beyond the service worker only switches on when the app
 * is opened from the home screen (standalone) - in a normal browser tab the
 * site behaves exactly as before.
 */
export function PwaRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker.register('/sw.js').catch(() => { /* app works fine without it */ });
        }

        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone === true;
        if (!standalone) return;

        document.documentElement.dataset.standalone = 'true';

        // No browser "open in new tab / save image" menu on long-press.
        const onContextMenu = (e: Event) => {
            if ((e.target as Element | null)?.closest?.('a, img, button')) e.preventDefault();
        };

        // A light tick on taps of buttons and tabs, like native controls (Android).
        const onClick = (e: MouseEvent) => {
            const el = (e.target as Element | null)?.closest?.('button, [role="tab"], nav a');
            if (el && !(el as HTMLButtonElement).disabled) navigator.vibrate?.(6);
        };

        // iOS pinch-zoom inside an installed app feels broken.
        const onGesture = (e: Event) => e.preventDefault();

        document.addEventListener('contextmenu', onContextMenu);
        document.addEventListener('click', onClick, { passive: true });
        document.addEventListener('gesturestart', onGesture);
        return () => {
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('click', onClick);
            document.removeEventListener('gesturestart', onGesture);
        };
    }, []);

    return null;
}
