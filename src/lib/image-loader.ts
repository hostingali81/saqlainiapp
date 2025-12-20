import { readdir } from 'fs/promises';
import { join } from 'path';
import { cache } from 'react';

// Cache the directory reading so it doesn't hit the disk on every request
export const getProfileImages = cache(async () => {
    try {
        const imagePath = join(process.cwd(), 'public', 'upload', 'small_image');
        const files = await readdir(imagePath);
        return new Set(files);
    } catch (error) {
        console.error('Error reading image directory:', error);
        return new Set<string>();
    }
});
