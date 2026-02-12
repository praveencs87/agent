import type { LoadedSkill } from './types.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import os from 'node:os';

const execFileAsync = promisify(execFile);

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate a skill manifest and its constraints
 */
export async function validateSkill(skill: LoadedSkill): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const manifest = skill.manifest;

    // Check required fields
    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.description) errors.push('Missing required field: description');
    if (!manifest.tools || manifest.tools.length === 0) errors.push('Must declare at least one tool');
    if (!manifest.entrypoint) errors.push('Missing required field: entrypoint');

    // Validate entrypoint exists
    const entryPath = `${skill.path}/${manifest.entrypoint}`;
    try {
        await access(entryPath);
    } catch {
        errors.push(`Entrypoint not found: ${manifest.entrypoint}`);
    }

    // Check OS constraints
    if (manifest.constraints?.os) {
        const currentOS = os.platform();
        if (!manifest.constraints.os.includes(currentOS)) {
            warnings.push(`Skill requires OS: ${manifest.constraints.os.join(', ')} (current: ${currentOS})`);
        }
    }

    // Check binary constraints
    if (manifest.constraints?.binaries) {
        for (const bin of manifest.constraints.binaries) {
            try {
                await execFileAsync('which', [bin]);
            } catch {
                errors.push(`Required binary not found: ${bin}`);
            }
        }
    }

    // Validate version is semver
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (manifest.version && !semverRegex.test(manifest.version)) {
        errors.push(`Version must be semver: ${manifest.version}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Run a skill's validators
 */
export async function runValidators(
    skill: LoadedSkill,
    cwd: string
): Promise<{ name: string; passed: boolean; output: string }[]> {
    const results: { name: string; passed: boolean; output: string }[] = [];

    if (!skill.manifest.validators) return results;

    for (const validator of skill.manifest.validators) {
        try {
            const { stdout, stderr } = await execFileAsync(
                validator.command.split(' ')[0],
                validator.command.split(' ').slice(1),
                {
                    cwd: validator.cwd ?? cwd,
                    timeout: validator.timeout ?? 30000,
                    shell: true,
                }
            );
            results.push({
                name: validator.name,
                passed: true,
                output: stdout.toString() + stderr.toString(),
            });
        } catch (err) {
            const error = err as { stdout?: string; stderr?: string; message?: string };
            results.push({
                name: validator.name,
                passed: false,
                output: (error.stdout?.toString() ?? '') + (error.stderr?.toString() ?? '') + (error.message ?? ''),
            });
        }
    }

    return results;
}
