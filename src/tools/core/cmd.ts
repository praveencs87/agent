import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ToolDefinition } from '../types.js';

const execFileAsync = promisify(execFile);

// ─── cmd.run ───
export const cmdRun: ToolDefinition<
    { command: string; args?: string[]; cwd?: string; timeout?: number; env?: Record<string, string> },
    { stdout: string; stderr: string; exitCode: number }
> = {
    name: 'cmd.run',
    category: 'exec',
    description: 'Execute a shell command',
    inputSchema: z.object({
        command: z.string().describe('The command to execute'),
        args: z.array(z.string()).optional().default([]),
        cwd: z.string().optional(),
        timeout: z.number().optional().default(30000),
        env: z.record(z.string(), z.string()).optional(),
    }),
    outputSchema: z.object({
        stdout: z.string(),
        stderr: z.string(),
        exitCode: z.number(),
    }),
    permissions: ['exec'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            const { stdout, stderr } = await execFileAsync(input.command, input.args ?? [], {
                cwd: workDir,
                timeout: input.timeout,
                maxBuffer: 10 * 1024 * 1024, // 10MB
                env: { ...process.env, ...input.env },
                shell: true,
            });
            return {
                success: true,
                data: { stdout: stdout.toString(), stderr: stderr.toString(), exitCode: 0 },
                durationMs: 0,
            };
        } catch (err) {
            const error = err as { stdout?: string; stderr?: string; code?: number; message?: string };
            return {
                success: false,
                data: {
                    stdout: error.stdout?.toString() ?? '',
                    stderr: error.stderr?.toString() ?? '',
                    exitCode: error.code ?? 1,
                },
                error: error.message ?? 'Command execution failed',
                durationMs: 0,
            };
        }
    },
};

export const cmdTools = [cmdRun];
