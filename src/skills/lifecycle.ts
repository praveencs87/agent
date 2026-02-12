import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { LoadedSkill, SkillState } from './types.js';

/**
 * Manage skill lifecycle states: draft → approved → deprecated
 */
export class SkillLifecycle {
    /**
     * Transition a skill to a new state
     */
    async transition(skill: LoadedSkill, newState: SkillState): Promise<void> {
        const currentState = skill.manifest.state ?? 'draft';
        const validTransitions: Record<SkillState, SkillState[]> = {
            draft: ['approved'],
            approved: ['deprecated'],
            deprecated: ['approved'], // Can re-approve deprecated skills
        };

        const allowed = validTransitions[currentState];
        if (!allowed?.includes(newState)) {
            throw new Error(
                `Cannot transition skill "${skill.manifest.name}" from "${currentState}" to "${newState}". ` +
                `Valid transitions: ${allowed?.join(', ') ?? 'none'}`
            );
        }

        // Update manifest
        skill.manifest.state = newState;
        const manifestPath = path.join(skill.path, 'skill.json');
        const content = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(content);
        manifest.state = newState;
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    }

    /**
     * Check if a skill can run in daemon mode
     */
    canRunInDaemon(skill: LoadedSkill, allowDrafts: boolean = false): boolean {
        const state = skill.manifest.state ?? 'draft';
        if (state === 'approved') return true;
        if (state === 'draft' && allowDrafts) return true;
        return false;
    }

    /**
     * Check if a skill can be upgraded (not deprecated)
     */
    canUpgrade(skill: LoadedSkill): boolean {
        return skill.manifest.state !== 'deprecated';
    }
}
