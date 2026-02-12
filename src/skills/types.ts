import { z } from 'zod';
import type { PermissionCategory } from '../tools/types.js';

/**
 * Skill lifecycle states
 */
export type SkillState = 'draft' | 'approved' | 'deprecated';

/**
 * Validator configuration within a skill
 */
export interface ValidatorConfig {
    name: string;
    command: string;
    cwd?: string;
    timeout?: number;
}

/**
 * Skill manifest shape (skill.json)
 */
export interface SkillManifest {
    name: string;
    version: string;
    description: string;
    author?: string;
    inputs: Record<string, unknown>; // JSON Schema
    outputs?: Record<string, unknown>;
    tools: string[];
    permissions: {
        required: PermissionCategory[];
        optional?: PermissionCategory[];
    };
    constraints?: {
        os?: string[];
        binaries?: string[];
    };
    entrypoint: string; // 'prompt.md' | 'workflow.ts'
    validators?: ValidatorConfig[];
    state?: SkillState;
    tags?: string[];
}

/**
 * Zod schema for skill.json validation
 */
export const SkillManifestSchema = z.object({
    name: z.string().min(1).regex(/^[a-z0-9][a-z0-9._-]*$/, 'Must be lowercase alphanumeric'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver (e.g., 1.0.0)'),
    description: z.string().min(1),
    author: z.string().optional(),
    inputs: z.record(z.string(), z.unknown()).default({}),
    outputs: z.record(z.string(), z.unknown()).optional(),
    tools: z.array(z.string()).min(1),
    permissions: z.object({
        required: z.array(z.string()),
        optional: z.array(z.string()).optional(),
    }),
    constraints: z.object({
        os: z.array(z.string()).optional(),
        binaries: z.array(z.string()).optional(),
    }).optional(),
    entrypoint: z.string(),
    validators: z.array(z.object({
        name: z.string(),
        command: z.string(),
        cwd: z.string().optional(),
        timeout: z.number().optional(),
    })).optional(),
    state: z.enum(['draft', 'approved', 'deprecated']).default('draft'),
    tags: z.array(z.string()).optional(),
});

/**
 * Loaded skill with manifest + content
 */
export interface LoadedSkill {
    manifest: SkillManifest;
    path: string;
    promptContent?: string;
    workflowPath?: string;
}
