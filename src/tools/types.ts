import { z } from 'zod';

// ─── Permission Categories ───
export type PermissionCategory =
    | 'filesystem'
    | 'filesystem.read'
    | 'filesystem.write'
    | 'exec'
    | 'network'
    | 'ui_automation'
    | 'secrets';

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
    'filesystem',
    'filesystem.read',
    'filesystem.write',
    'exec',
    'network',
    'ui_automation',
    'secrets',
];

// ─── Tool Result ───
export interface ToolResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    durationMs: number;
    metadata?: Record<string, unknown>;
}

// ─── Execution Context ───
export interface ExecutionContext {
    runId: string;
    stepId?: string;
    cwd: string;
    config: import('../config/schema.js').AgentConfig;
    dryRun?: boolean;
    autonomous?: boolean;
    approvedPermissions: Set<string>;
    onApproval?: (action: ActionDescriptor) => Promise<boolean>;
    onProgress?: (message: string) => void;
}

// ─── Action Descriptor (for approval prompts) ───
export interface ActionDescriptor {
    tool: string;
    operation: string;
    description: string;
    permissions: PermissionCategory[];
    args?: Record<string, unknown>;
    riskLevel: 'low' | 'medium' | 'high';
}

// ─── Tool Definition ───
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
    name: string;
    category: string;
    description: string;
    inputSchema: z.ZodType<TInput>;
    outputSchema: z.ZodType<TOutput>;
    permissions: PermissionCategory[];
    timeout?: number;
    execute(input: TInput, ctx: ExecutionContext): Promise<ToolResult<TOutput>>;
}

// ─── Tool Metadata (without execute function, for listing) ───
export interface ToolMetadata {
    name: string;
    category: string;
    description: string;
    permissions: PermissionCategory[];
}
