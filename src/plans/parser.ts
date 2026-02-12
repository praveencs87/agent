import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { PlanSchema, type Plan } from './types.js';
import { validateSchema } from '../utils/schema.js';
import { getPlansDir } from '../utils/paths.js';

/**
 * Plan parser — loads and validates .plan.yaml files
 */
export class PlanParser {
    /**
     * Parse a plan from a YAML file
     */
    async parseFile(filePath: string): Promise<Plan> {
        const absPath = path.resolve(filePath);
        const content = await readFile(absPath, 'utf-8');
        return this.parseYaml(content, absPath);
    }

    /**
     * Parse a plan from YAML text
     */
    parseYaml(content: string, source?: string): Plan {
        const raw = parseYaml(content);
        const result = validateSchema(PlanSchema, raw, source ?? 'plan.yaml');

        if (!result.success) {
            throw new Error(`Invalid plan file${source ? ` (${source})` : ''}:\n${result.errors.join('\n')}`);
        }

        return result.data as Plan;
    }

    /**
     * List all plans in the plans directory
     */
    async listPlans(plansDir?: string): Promise<{ name: string; path: string }[]> {
        const dir = plansDir ?? getPlansDir();
        const plans: { name: string; path: string }[] = [];

        try {
            await access(dir);
        } catch {
            return plans;
        }

        const entries = await readdir(dir);
        for (const entry of entries) {
            if (entry.endsWith('.plan.yaml') || entry.endsWith('.plan.yml')) {
                const fullPath = path.join(dir, entry);
                try {
                    const plan = await this.parseFile(fullPath);
                    plans.push({ name: plan.name, path: fullPath });
                } catch {
                    plans.push({ name: entry.replace(/\.plan\.ya?ml$/, ''), path: fullPath });
                }
            }
        }

        return plans;
    }

    /**
     * Find a plan by name
     */
    async findPlan(name: string, plansDir?: string): Promise<Plan | null> {
        const dir = plansDir ?? getPlansDir();
        const candidates = [
            path.join(dir, `${name}.plan.yaml`),
            path.join(dir, `${name}.plan.yml`),
        ];

        for (const candidate of candidates) {
            try {
                await access(candidate);
                return await this.parseFile(candidate);
            } catch {
                continue;
            }
        }

        return null;
    }

    /**
     * Validate a plan file without executing
     */
    async validate(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
        try {
            await this.parseFile(filePath);
            return { valid: true, errors: [] };
        } catch (err) {
            return {
                valid: false,
                errors: [(err as Error).message],
            };
        }
    }
}
