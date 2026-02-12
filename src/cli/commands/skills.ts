import { Command } from 'commander';
import chalk from 'chalk';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ConfigLoader } from '../../config/loader.js';
import { SkillLoader } from '../../skills/loader.js';
import { validateSkill } from '../../skills/validator.js';
import { getSkillsDir } from '../../utils/paths.js';

/**
 * Fetch JSON from a URL using native https/http
 */
async function fetchJson(url: string): Promise<any> {
    const mod = url.startsWith('https') ? await import('node:https') : await import('node:http');
    return new Promise((resolve, reject) => {
        mod.get(url, (res: any) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchJson(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Invalid JSON from ${url}`)); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Fetch text content from a URL
 */
async function fetchText(url: string): Promise<string> {
    const mod = url.startsWith('https') ? await import('node:https') : await import('node:http');
    return new Promise((resolve, reject) => {
        mod.get(url, (res: any) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchText(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

interface RegistrySkill {
    name: string;
    version: string;
    description: string;
    author: string;
    category: string;
    tags: string[];
    path: string;
    tools: string[];
    permissions: string[];
}

interface Registry {
    version: number;
    name: string;
    skills: RegistrySkill[];
}

export function createSkillsCommand(): Command {
    const cmd = new Command('skills')
        .description('Manage skills');

    // ─── List installed skills ───
    cmd
        .command('list')
        .description('List installed skills')
        .action(async () => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const loader = new SkillLoader(config);
            const skills = await loader.loadAll();

            if (skills.length === 0) {
                console.log(chalk.yellow('\nNo skills installed.'));
                console.log(chalk.dim('  Create one: agent skills create <name>'));
                console.log(chalk.dim('  Or install: agent skills install <name>\n'));
                return;
            }

            console.log(chalk.bold.cyan('\n📦 Installed Skills\n'));
            for (const skill of skills) {
                const state = skill.manifest.state ?? 'draft';
                const stateColor = state === 'approved' ? chalk.green : state === 'deprecated' ? chalk.red : chalk.yellow;
                console.log(
                    `  ${chalk.white.bold(skill.manifest.name)}` +
                    ` ${chalk.dim(`v${skill.manifest.version}`)}` +
                    ` ${stateColor(`[${state}]`)}`
                );
                console.log(chalk.dim(`    ${skill.manifest.description}`));
                console.log(chalk.dim(`    Tools: ${skill.manifest.tools.join(', ')}`));
                console.log();
            }
        });

    // ─── Search the skill hub ───
    cmd
        .command('search <query>')
        .description('Search for skills on the Skill Hub')
        .option('-c, --category <category>', 'Filter by category')
        .action(async (query: string, opts: { category?: string }) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const registryUrl = config.skills?.registryUrl ??
                'https://raw.githubusercontent.com/praveencs87/agent-skills/main';

            console.log(chalk.dim(`\n🔍 Searching skill hub for "${query}"...\n`));

            try {
                const registry: Registry = await fetchJson(`${registryUrl}/registry.json`);
                const queryLower = query.toLowerCase();

                let results = registry.skills.filter(s => {
                    const matchName = s.name.toLowerCase().includes(queryLower);
                    const matchDesc = s.description.toLowerCase().includes(queryLower);
                    const matchTags = s.tags.some(t => t.toLowerCase().includes(queryLower));
                    const matchCategory = s.category.toLowerCase().includes(queryLower);
                    return matchName || matchDesc || matchTags || matchCategory;
                });

                // Filter by category if specified
                if (opts.category) {
                    const catLower = opts.category.toLowerCase();
                    results = results.filter(s => s.category.toLowerCase().includes(catLower));
                }

                if (results.length === 0) {
                    console.log(chalk.yellow(`  No skills found matching "${query}"`));
                    console.log(chalk.dim('  Try a broader search or browse categories.\n'));
                    return;
                }

                console.log(chalk.bold.cyan(`  Found ${results.length} skill(s):\n`));

                for (const skill of results) {
                    console.log(
                        `  ${chalk.white.bold(skill.name)}` +
                        ` ${chalk.dim(`v${skill.version}`)}` +
                        ` ${chalk.magenta(`[${skill.category}]`)}`
                    );
                    console.log(chalk.dim(`    ${skill.description}`));
                    console.log(chalk.dim(`    Tags: ${skill.tags.join(', ')}`));
                    console.log(chalk.dim(`    Install: agent skills install ${skill.name}`));
                    console.log();
                }

                console.log(chalk.dim(`  Total: ${registry.skills.length} skills available in hub\n`));

            } catch (err) {
                console.error(chalk.red(`\n✗ Failed to search hub: ${(err as Error).message}`));
                console.error(chalk.dim('  Check your internet connection or registry URL.\n'));
                process.exit(1);
            }
        });

    // ─── Create a new skill ───
    cmd
        .command('create <name>')
        .description('Create a new skill from template')
        .action(async (name: string) => {
            const skillDir = path.join(getSkillsDir(), name);
            await mkdir(skillDir, { recursive: true });

            const manifest = {
                name,
                version: '0.1.0',
                description: `Description for ${name}`,
                inputs: {},
                tools: ['fs.read'],
                permissions: { required: ['filesystem.read'] },
                entrypoint: 'prompt.md',
                state: 'draft',
            };

            await writeFile(
                path.join(skillDir, 'skill.json'),
                JSON.stringify(manifest, null, 2) + '\n',
                'utf-8'
            );

            await writeFile(
                path.join(skillDir, 'prompt.md'),
                `# ${name}\n\n## Description\nDescribe what this skill does.\n\n## Instructions\nProvide instructions for the LLM.\n\n## Input Variables\n{{input}}\n`,
                'utf-8'
            );

            console.log(chalk.green(`\n✓ Created skill "${name}" at ${skillDir}`));
            console.log(chalk.dim(`  Edit skill.json and prompt.md to customize.\n`));
        });

    // ─── Install a skill (local path OR from hub) ───
    cmd
        .command('install <source>')
        .description('Install a skill from the Skill Hub or a local path')
        .action(async (source: string) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();

            // Check if source is a local path (starts with . or / or contains path separator)
            const isLocalPath = source.startsWith('.') || source.startsWith('/') || source.includes(path.sep);

            if (isLocalPath) {
                // Local install (existing logic)
                const loader = new SkillLoader(config);
                try {
                    const skill = await loader.installFromPath(source);
                    if (skill) {
                        console.log(chalk.green(`\n✓ Installed skill "${skill.manifest.name}" v${skill.manifest.version}\n`));
                    }
                } catch (err) {
                    console.error(chalk.red(`\n✗ Failed to install: ${(err as Error).message}\n`));
                    process.exit(1);
                }
            } else {
                // Remote install from skill hub
                const registryUrl = config.skills?.registryUrl ??
                    'https://raw.githubusercontent.com/praveencs87/agent-skills/main';

                console.log(chalk.dim(`\n📥 Installing "${source}" from Skill Hub...\n`));

                try {
                    // 1. Fetch registry to find the skill
                    const registry: Registry = await fetchJson(`${registryUrl}/registry.json`);
                    const skillInfo = registry.skills.find(s => s.name === source);

                    if (!skillInfo) {
                        console.error(chalk.red(`\n✗ Skill "${source}" not found in the registry.`));
                        console.log(chalk.dim('  Use `agent skills search <query>` to find available skills.\n'));
                        process.exit(1);
                    }

                    // 2. Download skill.json
                    const skillJsonUrl = `${registryUrl}/${skillInfo.path}/skill.json`;
                    const skillManifest = await fetchJson(skillJsonUrl);

                    // 3. Download prompt.md (entrypoint)
                    const entrypoint = skillManifest.entrypoint || 'prompt.md';
                    const promptUrl = `${registryUrl}/${skillInfo.path}/${entrypoint}`;
                    const promptContent = await fetchText(promptUrl);

                    // 4. Create local skill directory
                    const skillDir = path.join(getSkillsDir(), source);
                    await mkdir(skillDir, { recursive: true });

                    // 5. Write skill.json
                    await writeFile(
                        path.join(skillDir, 'skill.json'),
                        JSON.stringify(skillManifest, null, 2) + '\n',
                        'utf-8'
                    );

                    // 6. Write prompt.md
                    await writeFile(
                        path.join(skillDir, entrypoint),
                        promptContent,
                        'utf-8'
                    );

                    // 7. Try to download extra files (like send.js for send-email)
                    // Check if skill has known extra files
                    try {
                        if (source === 'send-email') {
                            const sendJs = await fetchText(`${registryUrl}/${skillInfo.path}/send.js`);
                            await writeFile(path.join(skillDir, 'send.js'), sendJs, 'utf-8');
                        }
                    } catch {
                        // Extra files are optional, ignore errors
                    }

                    console.log(chalk.green(`  ✓ Installed "${skillInfo.name}" v${skillInfo.version}`));
                    console.log(chalk.dim(`    Category:    ${skillInfo.category}`));
                    console.log(chalk.dim(`    Description: ${skillInfo.description}`));
                    console.log(chalk.dim(`    Tools:       ${skillInfo.tools.join(', ')}`));
                    console.log(chalk.dim(`    Path:        ${skillDir}`));
                    console.log(chalk.dim(`\n  Run: agent run --skill ${source} "<goal>"\n`));

                } catch (err) {
                    console.error(chalk.red(`\n✗ Failed to install "${source}": ${(err as Error).message}`));
                    console.error(chalk.dim('  Check your internet connection or try again later.\n'));
                    process.exit(1);
                }
            }
        });

    // ─── Remove a skill ───
    cmd
        .command('remove <name>')
        .description('Remove an installed skill')
        .action(async (name: string) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const loader = new SkillLoader(config);
            await loader.loadAll();

            const removed = await loader.remove(name);
            if (removed) {
                console.log(chalk.green(`\n✓ Removed skill "${name}"\n`));
            } else {
                console.error(chalk.red(`\n✗ Skill "${name}" not found\n`));
            }
        });

    // ─── Show skill info ───
    cmd
        .command('info <name>')
        .description('Show detailed information about a skill')
        .action(async (name: string) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const loader = new SkillLoader(config);
            await loader.loadAll();

            const skill = loader.get(name);
            if (!skill) {
                console.error(chalk.red(`\nSkill "${name}" not found\n`));
                process.exit(1);
            }

            const m = skill.manifest;
            console.log(chalk.bold.cyan(`\n${m.name} v${m.version}\n`));
            console.log(`  ${chalk.dim('Description:')} ${m.description}`);
            console.log(`  ${chalk.dim('State:')}       ${m.state ?? 'draft'}`);
            console.log(`  ${chalk.dim('Entrypoint:')}  ${m.entrypoint}`);
            console.log(`  ${chalk.dim('Tools:')}       ${m.tools.join(', ')}`);
            console.log(`  ${chalk.dim('Permissions:')} ${m.permissions.required.join(', ')}`);
            console.log(`  ${chalk.dim('Path:')}        ${skill.path}`);

            if (m.constraints) {
                if (m.constraints.os) console.log(`  ${chalk.dim('OS:')}          ${m.constraints.os.join(', ')}`);
                if (m.constraints.binaries) console.log(`  ${chalk.dim('Binaries:')}    ${m.constraints.binaries.join(', ')}`);
            }

            const validation = await validateSkill(skill);
            console.log(
                `\n  ${chalk.dim('Valid:')}       ${validation.valid ? chalk.green('Yes') : chalk.red('No')}`
            );
            if (!validation.valid) {
                for (const err of validation.errors) {
                    console.log(chalk.red(`    - ${err}`));
                }
            }
            if (validation.warnings.length > 0) {
                for (const w of validation.warnings) {
                    console.log(chalk.yellow(`    ⚠ ${w}`));
                }
            }
            console.log();
        });

    // ─── Update / sync skills from hub ───
    cmd
        .command('update')
        .description('Sync all installed skills with the latest from Skill Hub')
        .action(async () => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const loader = new SkillLoader(config);
            const installed = await loader.loadAll();
            const registryUrl = config.skills?.registryUrl ??
                'https://raw.githubusercontent.com/praveencs87/agent-skills/main';

            if (installed.length === 0) {
                console.log(chalk.yellow('\nNo skills installed to update.\n'));
                return;
            }

            console.log(chalk.dim(`\n🔄 Checking for updates...\n`));

            try {
                const registry: Registry = await fetchJson(`${registryUrl}/registry.json`);
                let updated = 0;

                for (const skill of installed) {
                    const hubSkill = registry.skills.find(s => s.name === skill.manifest.name);
                    if (!hubSkill) {
                        console.log(chalk.dim(`  ⏭ ${skill.manifest.name} — not in hub (local skill)`));
                        continue;
                    }

                    if (hubSkill.version !== skill.manifest.version) {
                        console.log(
                            chalk.cyan(`  ⬆ ${skill.manifest.name}: `) +
                            chalk.dim(`${skill.manifest.version} → `) +
                            chalk.green(hubSkill.version)
                        );

                        // Re-download
                        const skillJsonUrl = `${registryUrl}/${hubSkill.path}/skill.json`;
                        const newManifest = await fetchJson(skillJsonUrl);
                        const entrypoint = newManifest.entrypoint || 'prompt.md';
                        const promptUrl = `${registryUrl}/${hubSkill.path}/${entrypoint}`;
                        const promptContent = await fetchText(promptUrl);

                        await writeFile(
                            path.join(skill.path, 'skill.json'),
                            JSON.stringify(newManifest, null, 2) + '\n',
                            'utf-8'
                        );
                        await writeFile(
                            path.join(skill.path, entrypoint),
                            promptContent,
                            'utf-8'
                        );

                        updated++;
                    } else {
                        console.log(chalk.dim(`  ✓ ${skill.manifest.name} — already latest (v${skill.manifest.version})`));
                    }
                }

                console.log(chalk.green(`\n✓ ${updated} skill(s) updated.\n`));
            } catch (err) {
                console.error(chalk.red(`\n✗ Failed to check updates: ${(err as Error).message}\n`));
                process.exit(1);
            }
        });

    // ─── Browse all available skills ───
    cmd
        .command('browse')
        .description('Browse all available skills on the Skill Hub')
        .action(async () => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
            const registryUrl = config.skills?.registryUrl ??
                'https://raw.githubusercontent.com/praveencs87/agent-skills/main';

            console.log(chalk.dim(`\n📚 Fetching skill catalog...\n`));

            try {
                const registry: Registry = await fetchJson(`${registryUrl}/registry.json`);

                // Group by category
                const categories = new Map<string, RegistrySkill[]>();
                for (const skill of registry.skills) {
                    const cat = skill.category || 'Uncategorized';
                    if (!categories.has(cat)) categories.set(cat, []);
                    categories.get(cat)!.push(skill);
                }

                console.log(chalk.bold.cyan(`  🧠 ${registry.name}\n`));

                for (const [category, skills] of categories) {
                    console.log(chalk.bold.magenta(`  ${category}`));
                    for (const s of skills) {
                        console.log(
                            `    ${chalk.white(s.name)}` +
                            chalk.dim(` — ${s.description}`)
                        );
                    }
                    console.log();
                }

                console.log(chalk.dim(`  Total: ${registry.skills.length} skills available`));
                console.log(chalk.dim(`  Install: agent skills install <name>\n`));

            } catch (err) {
                console.error(chalk.red(`\n✗ Failed to fetch catalog: ${(err as Error).message}\n`));
                process.exit(1);
            }
        });

    return cmd;
}
