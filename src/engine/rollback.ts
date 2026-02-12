import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createPatch } from 'diff';
import type { FileDiff } from './types.js';

/**
 * Rollback tracker — captures file states and generates patches for undo
 */
export class RollbackTracker {
    private beforeStates: Map<string, Map<string, string>> = new Map(); // stepId → (file → content)
    private diffs: FileDiff[] = [];

    /**
     * Capture file state before modification
     */
    async captureBeforeState(stepId: string, filePath: string, cwd: string): Promise<void> {
        const absPath = path.resolve(cwd, filePath);
        let content = '';
        try {
            await access(absPath);
            content = await readFile(absPath, 'utf-8');
        } catch {
            content = ''; // File doesn't exist yet
        }

        if (!this.beforeStates.has(stepId)) {
            this.beforeStates.set(stepId, new Map());
        }
        this.beforeStates.get(stepId)!.set(absPath, content);
    }

    /**
     * Capture file state after modification and generate diff
     */
    async captureAfterState(stepId: string, filePath: string, cwd: string): Promise<void> {
        const absPath = path.resolve(cwd, filePath);
        const beforeMap = this.beforeStates.get(stepId);
        if (!beforeMap) return;

        const before = beforeMap.get(absPath) ?? '';
        let after = '';
        try {
            after = await readFile(absPath, 'utf-8');
        } catch {
            after = '';
        }

        if (before !== after) {
            const patch = createPatch(absPath, before, after, 'before', 'after');
            this.diffs.push({ file: absPath, before, after, patch });
        }
    }

    /**
     * Get all diffs captured during execution
     */
    getDiffs(): FileDiff[] {
        return this.diffs;
    }

    /**
     * Rollback a specific step
     */
    async rollbackStep(stepId: string): Promise<string[]> {
        const beforeMap = this.beforeStates.get(stepId);
        if (!beforeMap) return [];

        const restored: string[] = [];
        for (const [filePath, content] of beforeMap) {
            await writeFile(filePath, content, 'utf-8');
            restored.push(filePath);
        }

        return restored;
    }

    /**
     * Rollback all steps in reverse order
     */
    async rollbackAll(): Promise<string[]> {
        const allRestored: string[] = [];
        const stepIds = Array.from(this.beforeStates.keys()).reverse();

        for (const stepId of stepIds) {
            const restored = await this.rollbackStep(stepId);
            allRestored.push(...restored);
        }

        return allRestored;
    }

    /**
     * Export all patches for manual rollback
     */
    exportPatches(): string {
        return this.diffs.map((d) => d.patch).join('\n');
    }

    /**
     * Clear all tracked state
     */
    clear(): void {
        this.beforeStates.clear();
        this.diffs.length = 0;
    }
}
