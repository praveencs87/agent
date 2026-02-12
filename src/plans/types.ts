import { z } from 'zod';

// ─── Goal ───
export interface Goal {
    id: string;
    description: string;
    successCriteria: string[];
    riskLevel: 'low' | 'medium' | 'high';
}

// ─── Plan Step ───
export interface PlanStep {
    id: string;
    name: string;
    description?: string;
    skill?: string;
    tool?: string;
    args?: Record<string, unknown>;
    verify?: VerifyConfig;
    onFailure?: 'retry' | 'skip' | 'abort';
    retries?: number;
    dependsOn?: string[];
}

export interface VerifyConfig {
    command?: string;
    fileExists?: string;
    exitCode?: number;
    contains?: string;
}

// ─── Trigger ───
export type TriggerType = 'manual' | 'cron' | 'fs_change' | 'git_event' | 'webhook';

export interface TriggerConfig {
    type: TriggerType;
    cron?: string;
    paths?: string[];
    gitEvents?: ('commit' | 'push' | 'branch_change')[];
    webhookPath?: string;
}

// ─── Plan Policy ───
export interface PlanPolicy {
    approvals: 'auto' | 'per_step' | 'pre_approve';
    scope?: {
        filesystemAllowlist?: string[];
        commandAllowlist?: string[];
    };
}

// ─── Output Config ───
export interface OutputConfig {
    name: string;
    type: 'file' | 'artifact' | 'log';
    path?: string;
}

// ─── Plan Mode ───
export type PlanMode = 'execute' | 'propose';

// ─── Full Plan ───
export interface Plan {
    name: string;
    description: string;
    mode: PlanMode;
    goals: Goal[];
    steps: PlanStep[];
    policy: PlanPolicy;
    trigger: TriggerConfig;
    outputs?: OutputConfig[];
}

// ─── Plan Run ───
export interface PlanRun {
    runId: string;
    planName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted' | 'proposed';
    steps: PlanStepRun[];
    startedAt?: string;
    completedAt?: string;
    triggeredBy: string;
}

export interface PlanStepRun {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    output?: unknown;
    error?: string;
    durationMs?: number;
    verification?: { passed: boolean; details: string };
}

// ─── Zod Schemas for Plan YAML ───
export const GoalSchema = z.object({
    id: z.string(),
    description: z.string(),
    successCriteria: z.array(z.string()).default([]),
    riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
});

export const VerifySchema = z.object({
    command: z.string().optional(),
    fileExists: z.string().optional(),
    exitCode: z.number().optional(),
    contains: z.string().optional(),
});

export const StepSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    skill: z.string().optional(),
    tool: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    verify: VerifySchema.optional(),
    onFailure: z.enum(['retry', 'skip', 'abort']).default('abort'),
    retries: z.number().default(0),
    dependsOn: z.array(z.string()).optional(),
});

export const TriggerSchema = z.object({
    type: z.enum(['manual', 'cron', 'fs_change', 'git_event', 'webhook']).default('manual'),
    cron: z.string().optional(),
    paths: z.array(z.string()).optional(),
    gitEvents: z.array(z.enum(['commit', 'push', 'branch_change'])).optional(),
    webhookPath: z.string().optional(),
});

export const PlanPolicySchema = z.object({
    approvals: z.enum(['auto', 'per_step', 'pre_approve']).default('per_step'),
    scope: z.object({
        filesystemAllowlist: z.array(z.string()).optional(),
        commandAllowlist: z.array(z.string()).optional(),
    }).optional(),
});

export const OutputSchema = z.object({
    name: z.string(),
    type: z.enum(['file', 'artifact', 'log']),
    path: z.string().optional(),
});

export const PlanSchema = z.object({
    name: z.string().min(1),
    description: z.string(),
    mode: z.enum(['execute', 'propose']).default('execute'),
    goals: z.array(GoalSchema).min(1),
    steps: z.array(StepSchema).min(1),
    policy: PlanPolicySchema.default({}),
    trigger: TriggerSchema.default({ type: 'manual' }),
    outputs: z.array(OutputSchema).optional(),
});
