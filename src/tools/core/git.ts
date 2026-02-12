import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolDefinition } from '../types.js';

const execFileAsync = promisify(execFile);

async function gitExec(args: string[], cwd: string): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 5 * 1024 * 1024 });
    return stdout.toString().trim();
}

// ─── git.status ───
export const gitStatus: ToolDefinition<{ cwd?: string }, { status: string; isClean: boolean }> = {
    name: 'git.status',
    category: 'git',
    description: 'Get git repository status',
    inputSchema: z.object({ cwd: z.string().optional() }),
    outputSchema: z.object({ status: z.string(), isClean: z.boolean() }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            const status = await gitExec(['status', '--porcelain'], workDir);
            return {
                success: true,
                data: { status, isClean: status.length === 0 },
                durationMs: 0,
            };
        } catch (err) {
            return { success: false, error: `git status failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

// ─── git.diff ───
export const gitDiff: ToolDefinition<{ cwd?: string; staged?: boolean; path?: string }, { diff: string; filesChanged: number }> = {
    name: 'git.diff',
    category: 'git',
    description: 'Get git diff output',
    inputSchema: z.object({
        cwd: z.string().optional(),
        staged: z.boolean().optional().default(false),
        path: z.string().optional(),
    }),
    outputSchema: z.object({ diff: z.string(), filesChanged: z.number() }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            const args = ['diff'];
            if (input.staged) args.push('--cached');
            args.push('--stat');
            if (input.path) args.push('--', input.path);
            const statOutput = await gitExec(args, workDir);

            const diffArgs = ['diff'];
            if (input.staged) diffArgs.push('--cached');
            if (input.path) diffArgs.push('--', input.path);
            const diff = await gitExec(diffArgs, workDir);

            const filesChanged = statOutput.split('\n').filter((l) => l.includes('|')).length;
            return {
                success: true,
                data: { diff, filesChanged },
                durationMs: 0,
            };
        } catch (err) {
            return { success: false, error: `git diff failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

// ─── git.log ───
export const gitLog: ToolDefinition<
    { cwd?: string; maxCount?: number; format?: string },
    { entries: GitLogEntry[] }
> = {
    name: 'git.log',
    category: 'git',
    description: 'Get git commit log',
    inputSchema: z.object({
        cwd: z.string().optional(),
        maxCount: z.number().optional().default(10),
        format: z.string().optional(),
    }),
    outputSchema: z.object({
        entries: z.array(z.object({
            hash: z.string(),
            author: z.string(),
            date: z.string(),
            message: z.string(),
        })),
    }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            const separator = '|||';
            const output = await gitExec(
                ['log', `-${input.maxCount}`, `--format=%H${separator}%an${separator}%ai${separator}%s`],
                workDir
            );
            if (!output) {
                return { success: true, data: { entries: [] }, durationMs: 0 };
            }
            const entries: GitLogEntry[] = output.split('\n').map((line) => {
                const [hash, author, date, message] = line.split(separator);
                return { hash, author, date, message };
            });
            return { success: true, data: { entries }, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `git log failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

interface GitLogEntry {
    hash: string;
    author: string;
    date: string;
    message: string;
}

// ─── git.commit ───
export const gitCommit: ToolDefinition<
    { cwd?: string; message: string; stageAll?: boolean },
    { commitHash: string }
> = {
    name: 'git.commit',
    category: 'git',
    description: 'Create a git commit',
    inputSchema: z.object({
        cwd: z.string().optional(),
        message: z.string(),
        stageAll: z.boolean().optional().default(false),
    }),
    outputSchema: z.object({ commitHash: z.string() }),
    permissions: ['exec'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            if (input.stageAll) {
                await gitExec(['add', '-A'], workDir);
            }
            await gitExec(['commit', '-m', input.message], workDir);
            const hash = await gitExec(['rev-parse', 'HEAD'], workDir);
            return { success: true, data: { commitHash: hash }, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `git commit failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

export const gitTools = [gitStatus, gitDiff, gitLog, gitCommit];
