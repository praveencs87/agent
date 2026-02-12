import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { getRunsDir } from '../utils/paths.js';
import { auditEmitter, type AuditEvent } from '../policy/audit.js';
import { redactSecrets } from '../config/secrets.js';

export interface RunLog {
    runId: string;
    planName?: string;
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed' | 'aborted';
    events: AuditEvent[];
    steps: StepLog[];
    diffs: DiffEntry[];
    summary?: RunSummary;
}

export interface StepLog {
    stepId: string;
    skill?: string;
    tool?: string;
    startedAt: string;
    completedAt?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    verification?: { passed: boolean; details: string };
}

export interface DiffEntry {
    file: string;
    before: string;
    after: string;
    stepId: string;
    timestamp: string;
}

export interface RunSummary {
    stepsCompleted: number;
    stepsFailed: number;
    stepsSkipped: number;
    filesChanged: number;
    durationMs: number;
    verificationsPassed: number;
    verificationsFailed: number;
}

/**
 * Audit logger — writes run-level audit logs to .agent/runs/<runId>/
 */
export class AuditLogger {
    private runLog: RunLog;
    private runDir: string;

    constructor(runId: string, planName?: string) {
        this.runDir = path.join(getRunsDir(), runId);
        this.runLog = {
            runId,
            planName,
            startedAt: new Date().toISOString(),
            status: 'running',
            events: [],
            steps: [],
            diffs: [],
        };

        // Subscribe to audit events
        auditEmitter.onAudit((event) => {
            this.runLog.events.push(event);
        });
    }

    /**
     * Initialize the run directory
     */
    async init(): Promise<void> {
        await mkdir(this.runDir, { recursive: true });
        await this.save();
    }

    /**
     * Add a step log entry
     */
    addStep(step: StepLog): void {
        this.runLog.steps.push(step);
    }

    /**
     * Update an existing step
     */
    updateStep(stepId: string, updates: Partial<StepLog>): void {
        const step = this.runLog.steps.find((s) => s.stepId === stepId);
        if (step) {
            Object.assign(step, updates);
        }
    }

    /**
     * Record a file diff
     */
    addDiff(diff: DiffEntry): void {
        this.runLog.diffs.push(diff);
    }

    /**
     * Complete the run
     */
    async complete(status: 'completed' | 'failed' | 'aborted'): Promise<void> {
        this.runLog.completedAt = new Date().toISOString();
        this.runLog.status = status;
        this.runLog.summary = this.buildSummary();
        await this.save();
    }

    /**
     * Get the current run log
     */
    getRunLog(): RunLog {
        return this.runLog;
    }

    /**
     * Save the run log to disk
     */
    async save(): Promise<void> {
        const logPath = path.join(this.runDir, 'run.json');
        const content = JSON.stringify(this.runLog, null, 2);
        await writeFile(logPath, redactSecrets(content), 'utf-8');

        // Save diffs separately
        if (this.runLog.diffs.length > 0) {
            const diffPath = path.join(this.runDir, 'diffs.json');
            await writeFile(diffPath, JSON.stringify(this.runLog.diffs, null, 2), 'utf-8');
        }
    }

    // ─── Static helpers ───

    /**
     * Load a run log from disk
     */
    static async loadRun(runId: string): Promise<RunLog | null> {
        const runDir = path.join(getRunsDir(), runId);
        try {
            const content = await readFile(path.join(runDir, 'run.json'), 'utf-8');
            return JSON.parse(content) as RunLog;
        } catch {
            return null;
        }
    }

    /**
     * List all run IDs
     */
    static async listRuns(): Promise<string[]> {
        try {
            const entries = await readdir(getRunsDir(), { withFileTypes: true });
            return entries
                .filter((e) => e.isDirectory())
                .map((e) => e.name)
                .sort()
                .reverse();
        } catch {
            return [];
        }
    }

    // ─── Private ───

    private buildSummary(): RunSummary {
        const steps = this.runLog.steps;
        const startTime = new Date(this.runLog.startedAt).getTime();
        const endTime = this.runLog.completedAt
            ? new Date(this.runLog.completedAt).getTime()
            : Date.now();

        return {
            stepsCompleted: steps.filter((s) => s.status === 'completed').length,
            stepsFailed: steps.filter((s) => s.status === 'failed').length,
            stepsSkipped: steps.filter((s) => s.status === 'skipped').length,
            filesChanged: new Set(this.runLog.diffs.map((d) => d.file)).size,
            durationMs: endTime - startTime,
            verificationsPassed: steps.filter((s) => s.verification?.passed).length,
            verificationsFailed: steps.filter((s) => s.verification && !s.verification.passed).length,
        };
    }
}
