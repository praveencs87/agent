/**
 * Sandbox for running skill validators safely
 * Placeholder for Phase 3 — will add proper sandboxing
 */
export async function runInSandbox(
    command: string,
    cwd: string,
    timeout: number = 30000
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    try {
        const { stdout, stderr } = await execFileAsync(
            command.split(' ')[0],
            command.split(' ').slice(1),
            { cwd, timeout, shell: true }
        );
        return { exitCode: 0, stdout: stdout.toString(), stderr: stderr.toString() };
    } catch (err) {
        const error = err as { code?: number; stdout?: string; stderr?: string };
        return {
            exitCode: error.code ?? 1,
            stdout: error.stdout?.toString() ?? '',
            stderr: error.stderr?.toString() ?? '',
        };
    }
}
