import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Deterministic verification helpers
 */
export class VerificationEngine {
    /**
     * Verify that a file exists
     */
    async fileExists(filePath: string, cwd: string): Promise<{ passed: boolean; details: string }> {
        const absPath = path.resolve(cwd, filePath);
        try {
            await access(absPath);
            return { passed: true, details: `File exists: ${filePath}` };
        } catch {
            return { passed: false, details: `File not found: ${filePath}` };
        }
    }

    /**
     * Verify that a command exits successfully
     */
    async commandExits(
        command: string,
        cwd: string,
        expectedCode: number = 0,
        timeout: number = 30000
    ): Promise<{ passed: boolean; details: string }> {
        try {
            const parts = command.split(' ');
            const { stdout } = await execFileAsync(parts[0], parts.slice(1), {
                cwd,
                timeout,
                shell: true,
            });
            return {
                passed: true,
                details: `Command succeeded (exit 0)\nstdout: ${stdout.toString().substring(0, 500)}`,
            };
        } catch (err) {
            const error = err as { code?: number; stderr?: string; message?: string };
            return {
                passed: error.code === expectedCode,
                details: `Command exited with code ${error.code ?? 'unknown'}: ${error.message ?? ''}`,
            };
        }
    }

    /**
     * Verify output contains expected string
     */
    async outputContains(
        command: string,
        expected: string,
        cwd: string
    ): Promise<{ passed: boolean; details: string }> {
        try {
            const parts = command.split(' ');
            const { stdout } = await execFileAsync(parts[0], parts.slice(1), {
                cwd,
                timeout: 30000,
                shell: true,
            });
            const output = stdout.toString();
            const contains = output.includes(expected);
            return {
                passed: contains,
                details: contains
                    ? `Output contains "${expected}"`
                    : `Output does not contain "${expected}"\nActual: ${output.substring(0, 300)}`,
            };
        } catch (err) {
            return {
                passed: false,
                details: `Command failed: ${(err as Error).message}`,
            };
        }
    }
}
