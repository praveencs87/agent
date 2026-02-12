import type { ToolResult, ExecutionContext } from '../tools/types.js';

/**
 * Result of executing a single step
 */
export interface StepResult {
    success: boolean;
    output?: unknown;
    error?: string;
    durationMs: number;
    toolCalls?: { tool: string; input: unknown; result: ToolResult }[];
    diffs?: FileDiff[];
}

/**
 * File diff captured during execution
 */
export interface FileDiff {
    file: string;
    before: string;
    after: string;
    patch: string;
}

/**
 * Execution state per step
 */
export type StepState =
    | 'pending'
    | 'precondition_check'
    | 'executing'
    | 'verifying'
    | 'retrying'
    | 'completed'
    | 'failed'
    | 'skipped';

// Re-export for convenience
export type { ExecutionContext, ToolResult };
