import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { getAgentDir } from '../utils/paths.js';

/**
 * Daemon manager — start/stop/status for the agent daemon process
 */
export class DaemonManager {
    private pidFile: string;

    constructor(pidFile?: string) {
        this.pidFile = pidFile ?? path.join(getAgentDir(), 'daemon.pid');
    }

    /**
     * Start the daemon
     */
    async start(): Promise<{ pid: number; message: string }> {
        // Check if already running
        const existing = await this.status();
        if (existing.running) {
            return { pid: existing.pid!, message: `Daemon already running (PID: ${existing.pid})` };
        }

        // Fork the daemon process
        const daemonScript = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            'scheduler.js'
        );

        const child: ChildProcess = fork(daemonScript, [], {
            detached: true,
            stdio: 'ignore',
        });

        child.unref();

        const pid = child.pid!;
        await writeFile(this.pidFile, String(pid), 'utf-8');

        return { pid, message: `Daemon started (PID: ${pid})` };
    }

    /**
     * Stop the daemon
     */
    async stop(): Promise<{ message: string }> {
        const status = await this.status();
        if (!status.running || !status.pid) {
            return { message: 'Daemon is not running' };
        }

        try {
            process.kill(status.pid, 'SIGTERM');
            // Clean up PID file
            const { unlink } = await import('node:fs/promises');
            await unlink(this.pidFile).catch(() => { });
            return { message: `Daemon stopped (PID: ${status.pid})` };
        } catch (err) {
            return { message: `Failed to stop daemon: ${(err as Error).message}` };
        }
    }

    /**
     * Get daemon status
     */
    async status(): Promise<{ running: boolean; pid?: number }> {
        try {
            await access(this.pidFile);
            const pidStr = await readFile(this.pidFile, 'utf-8');
            const pid = parseInt(pidStr.trim(), 10);

            // Check if process is alive
            try {
                process.kill(pid, 0);
                return { running: true, pid };
            } catch {
                // PID file exists but process is dead
                const { unlink } = await import('node:fs/promises');
                await unlink(this.pidFile).catch(() => { });
                return { running: false };
            }
        } catch {
            return { running: false };
        }
    }
}
