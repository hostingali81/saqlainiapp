import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number in Indian currency style (Lakhs/Crores)
 * Examples: 1234 → 1,234 | 123456 → 1,23,456 | 1234567 → 12,34,567
 */
export function formatIndianCurrency(amount: number): string {
  const numStr = amount.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);

  if (otherNumbers !== '') {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }

  return lastThree;
}

export function getPhotoUrl(userId: string | number, size: 'large' | 'small' = 'small'): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL not found');
    // An empty src resolves to the current page URL and fires a pointless
    // request; let the avatar fallback take over instead.
    return '';
  }

  const folder = size === 'large' ? 'large_image' : 'small_image';
  return `${supabaseUrl}/storage/v1/object/public/user-photos/${folder}/${userId}.jpg`;
}

/** Initials avatar used whenever a member has no uploaded photo. */
export function getAvatarFallbackUrl(name: string, size: number = 300): string {
  const safeName = (name || 'User').trim() || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&bold=true&color=0D483B&size=${size}`;
}

/**
 * Swap a broken photo for the initials avatar, at most once.
 *
 * Assigning the fallback inside `onError` without a guard means that if
 * ui-avatars.com is also unreachable (offline, blocked, ad blocker) the error
 * fires again on the very same URL and the handler loops.
 */
export function applyAvatarFallback(img: HTMLImageElement, name: string, size: number = 300): void {
  if (img.dataset.avatarFallbackApplied === 'true') return;
  img.dataset.avatarFallbackApplied = 'true';
  img.src = getAvatarFallbackUrl(name, size);
}
