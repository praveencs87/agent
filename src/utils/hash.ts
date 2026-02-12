import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Hash a string using SHA-256
 */
export function hashString(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a file's content
 */
export async function hashFile(filePath: string): Promise<string> {
    const content = await readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a short hash (first 8 chars) for display purposes
 */
export function shortHash(content: string): string {
    return hashString(content).substring(0, 8);
}
