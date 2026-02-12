import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getSkillsDir } from '../utils/paths.js';
import type { SkillManifest } from '../skills/types.js';
import { validateSkill } from '../skills/validator.js';
import { SkillLoader } from '../skills/loader.js';
import type { AgentConfig } from '../config/schema.js';

/**
 * Self-extension: generate, validate, and activate new skills
 *
 * GUARDRAIL: This module CANNOT modify:
 *   - src/policy/      (policy engine)
 *   - src/tools/registry.ts (tool router)
 *   - Any approval enforcement code
 */
export class SkillGenerator {
    private config: AgentConfig;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    /**
     * Generate a new skill from a description
     */
    async generateSkillDraft(
        name: string,
        description: string,
        tools: string[]
    ): Promise<string> {
        const skillDir = path.join(getSkillsDir(), name);
        await mkdir(skillDir, { recursive: true });

        // Generate skill.json manifest
        const manifest: SkillManifest = {
            name,
            version: '0.1.0',
            description,
            tools,
            permissions: {
                required: this.inferPermissions(tools),
            },
            entrypoint: 'prompt.md',
            state: 'draft',
        } as SkillManifest;

        await writeFile(
            path.join(skillDir, 'skill.json'),
            JSON.stringify(manifest, null, 2) + '\n',
            'utf-8'
        );

        // Generate prompt.md
        const prompt = this.generatePrompt(name, description, tools);
        await writeFile(path.join(skillDir, 'prompt.md'), prompt, 'utf-8');

        return skillDir;
    }

    /**
     * Validate a generated skill
     */
    async validateDraft(skillDir: string): Promise<{ valid: boolean; errors: string[] }> {
        const loader = new SkillLoader(this.config);
        const skill = await loader.loadSkill(skillDir);
        if (!skill) {
            return { valid: false, errors: ['Failed to load skill'] };
        }

        const result = await validateSkill(skill);
        return { valid: result.valid, errors: [...result.errors, ...result.warnings] };
    }

    // ─── Private ───

    private inferPermissions(tools: string[]): string[] {
        const perms = new Set<string>();
        for (const tool of tools) {
            if (tool.startsWith('fs.read') || tool === 'fs.list' || tool === 'fs.search') {
                perms.add('filesystem.read');
            }
            if (tool === 'fs.write' || tool === 'fs.patch') {
                perms.add('filesystem.write');
            }
            if (tool === 'cmd.run') {
                perms.add('exec');
            }
            if (tool.startsWith('git.')) {
                perms.add('filesystem.read');
            }
            if (tool === 'git.commit') {
                perms.add('exec');
            }
        }
        return Array.from(perms);
    }

    private generatePrompt(name: string, description: string, tools: string[]): string {
        return `# ${name}

## Description
${description}

## Available Tools
${tools.map((t) => `- \`${t}\``).join('\n')}

## Instructions
You are a skill that accomplishes the following goal:
${description}

Use the available tools to complete this task.
Follow these guidelines:
1. Plan your approach before taking action
2. Verify your work after each step
3. Handle errors gracefully
4. Report your progress clearly

## Input Variables
{{input}}

## Completion Criteria
- Task described above is complete
- All outputs are verified
- No errors remain
`;
    }
}
