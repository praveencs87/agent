import { z } from 'zod';
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ToolDefinition } from '../types.js';

// ─── fs.read ───
export const fsRead: ToolDefinition<{ path: string; encoding?: string }, { content: string }> = {
    name: 'fs.read',
    category: 'filesystem',
    description: 'Read file contents',
    inputSchema: z.object({
        path: z.string().describe('Absolute or relative file path'),
        encoding: z.string().optional().default('utf-8'),
    }),
    outputSchema: z.object({ content: z.string() }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const filePath = path.resolve(ctx.cwd, input.path);
        try {
            const content = await readFile(filePath, input.encoding as BufferEncoding);
            return { success: true, data: { content }, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `Failed to read ${filePath}: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

// ─── fs.write ───
export const fsWrite: ToolDefinition<{ path: string; content: string; createDirs?: boolean }, { bytesWritten: number }> = {
    name: 'fs.write',
    category: 'filesystem',
    description: 'Write content to a file',
    inputSchema: z.object({
        path: z.string(),
        content: z.string(),
        createDirs: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({ bytesWritten: z.number() }),
    permissions: ['filesystem.write'],
    async execute(input, ctx) {
        const filePath = path.resolve(ctx.cwd, input.path);
        try {
            if (input.createDirs) {
                await mkdir(path.dirname(filePath), { recursive: true });
            }
            await writeFile(filePath, input.content, 'utf-8');
            return { success: true, data: { bytesWritten: Buffer.byteLength(input.content) }, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `Failed to write ${filePath}: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

// ─── fs.list ───
export const fsList: ToolDefinition<{ path: string; recursive?: boolean }, { entries: FileEntry[] }> = {
    name: 'fs.list',
    category: 'filesystem',
    description: 'List directory contents',
    inputSchema: z.object({
        path: z.string(),
        recursive: z.boolean().optional().default(false),
    }),
    outputSchema: z.object({
        entries: z.array(z.object({
            name: z.string(),
            type: z.enum(['file', 'directory']),
            size: z.number(),
            path: z.string(),
        })),
    }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const dirPath = path.resolve(ctx.cwd, input.path);
        try {
            const entries = await listDirectory(dirPath, input.recursive ?? false);
            return { success: true, data: { entries }, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `Failed to list ${dirPath}: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

interface FileEntry {
    name: string;
    type: 'file' | 'directory';
    size: number;
    path: string;
}

async function listDirectory(dirPath: string, recursive: boolean): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const items = await readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const stats = await stat(fullPath);
        entries.push({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            path: fullPath,
        });
        if (recursive && item.isDirectory()) {
            const subEntries = await listDirectory(fullPath, true);
            entries.push(...subEntries);
        }
    }
    return entries;
}

// ─── fs.search ───
export const fsSearch: ToolDefinition<{ path: string; pattern: string; maxResults?: number }, { matches: string[] }> = {
    name: 'fs.search',
    category: 'filesystem',
    description: 'Search for files matching a glob pattern',
    inputSchema: z.object({
        path: z.string(),
        pattern: z.string(),
        maxResults: z.number().optional().default(50),
    }),
    outputSchema: z.object({ matches: z.array(z.string()) }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const searchPath = path.resolve(ctx.cwd, input.path);
        try {
            const { glob } = await import('glob');
            const matches = await glob(input.pattern, {
                cwd: searchPath,
                maxDepth: 10,
                absolute: true,
            });
            return {
                success: true,
                data: { matches: matches.slice(0, input.maxResults) },
                durationMs: 0,
            };
        } catch (err) {
            return { success: false, error: `Search failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

// ─── fs.patch ───
export const fsPatch: ToolDefinition<
    { path: string; search: string; replace: string },
    { patched: boolean; originalContent: string }
> = {
    name: 'fs.patch',
    category: 'filesystem',
    description: 'Find and replace content in a file',
    inputSchema: z.object({
        path: z.string(),
        search: z.string(),
        replace: z.string(),
    }),
    outputSchema: z.object({ patched: z.boolean(), originalContent: z.string() }),
    permissions: ['filesystem.write'],
    async execute(input, ctx) {
        const filePath = path.resolve(ctx.cwd, input.path);
        try {
            const originalContent = await readFile(filePath, 'utf-8');
            if (!originalContent.includes(input.search)) {
                return {
                    success: false,
                    error: `Search string not found in ${filePath}`,
                    data: { patched: false, originalContent },
                    durationMs: 0,
                };
            }
            const newContent = originalContent.replace(input.search, input.replace);
            await writeFile(filePath, newContent, 'utf-8');
            return {
                success: true,
                data: { patched: true, originalContent },
                durationMs: 0,
            };
        } catch (err) {
            return { success: false, error: `Patch failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

/**
 * All filesystem tools
 */
export const fsTools = [fsRead, fsWrite, fsList, fsSearch, fsPatch];
