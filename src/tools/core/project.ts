import { z } from 'zod';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ToolDefinition } from '../types.js';

interface ProjectInfo {
    name: string;
    language: string;
    framework: string | null;
    packageManager: string | null;
    hasGit: boolean;
    dependencies: string[];
}

// Detection rules keyed by marker file
const FRAMEWORK_MARKERS: Record<string, { framework: string; language: string }> = {
    'next.config.js': { framework: 'Next.js', language: 'javascript' },
    'next.config.ts': { framework: 'Next.js', language: 'typescript' },
    'nuxt.config.js': { framework: 'Nuxt', language: 'javascript' },
    'nuxt.config.ts': { framework: 'Nuxt', language: 'typescript' },
    'angular.json': { framework: 'Angular', language: 'typescript' },
    'svelte.config.js': { framework: 'SvelteKit', language: 'javascript' },
    'astro.config.mjs': { framework: 'Astro', language: 'javascript' },
    'vite.config.ts': { framework: 'Vite', language: 'typescript' },
    'vite.config.js': { framework: 'Vite', language: 'javascript' },
    'Cargo.toml': { framework: null!, language: 'rust' },
    'go.mod': { framework: null!, language: 'go' },
    'pyproject.toml': { framework: null!, language: 'python' },
    'requirements.txt': { framework: null!, language: 'python' },
    'Gemfile': { framework: 'Rails', language: 'ruby' },
    'build.gradle': { framework: 'Gradle', language: 'java' },
    'pom.xml': { framework: 'Maven', language: 'java' },
};

const PACKAGE_MANAGERS = [
    { lockfile: 'pnpm-lock.yaml', name: 'pnpm' },
    { lockfile: 'yarn.lock', name: 'yarn' },
    { lockfile: 'bun.lockb', name: 'bun' },
    { lockfile: 'package-lock.json', name: 'npm' },
];

export const projectDetect: ToolDefinition<{ cwd?: string }, ProjectInfo> = {
    name: 'project.detect',
    category: 'project',
    description: 'Detect project language, framework, and dependencies',
    inputSchema: z.object({ cwd: z.string().optional() }),
    outputSchema: z.object({
        name: z.string(),
        language: z.string(),
        framework: z.string().nullable(),
        packageManager: z.string().nullable(),
        hasGit: z.boolean(),
        dependencies: z.array(z.string()),
    }),
    permissions: ['filesystem.read'],
    async execute(input, ctx) {
        const workDir = input.cwd ?? ctx.cwd;
        try {
            const info: ProjectInfo = {
                name: path.basename(workDir),
                language: 'unknown',
                framework: null,
                packageManager: null,
                hasGit: false,
                dependencies: [],
            };

            // Check git
            info.hasGit = await fileExists(path.join(workDir, '.git'));

            // Detect framework from marker files
            for (const [marker, detected] of Object.entries(FRAMEWORK_MARKERS)) {
                if (await fileExists(path.join(workDir, marker))) {
                    info.language = detected.language;
                    if (detected.framework) info.framework = detected.framework;
                    break;
                }
            }

            // Detect package manager
            for (const pm of PACKAGE_MANAGERS) {
                if (await fileExists(path.join(workDir, pm.lockfile))) {
                    info.packageManager = pm.name;
                    break;
                }
            }

            // Read package.json for Node.js projects
            const pkgPath = path.join(workDir, 'package.json');
            if (await fileExists(pkgPath)) {
                const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
                info.name = pkg.name ?? info.name;
                if (info.language === 'unknown') {
                    info.language = await fileExists(path.join(workDir, 'tsconfig.json'))
                        ? 'typescript'
                        : 'javascript';
                }
                info.dependencies = [
                    ...Object.keys(pkg.dependencies ?? {}),
                    ...Object.keys(pkg.devDependencies ?? {}),
                ];
            }

            return { success: true, data: info, durationMs: 0 };
        } catch (err) {
            return { success: false, error: `Project detection failed: ${(err as Error).message}`, durationMs: 0 };
        }
    },
};

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export const projectTools = [projectDetect];
