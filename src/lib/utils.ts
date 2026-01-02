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
    return '';
  }
  
  const folder = size === 'large' ? 'large_image' : 'small_image';
  return `${supabaseUrl}/storage/v1/object/public/user-photos/${folder}/${userId}.jpg`;
}
