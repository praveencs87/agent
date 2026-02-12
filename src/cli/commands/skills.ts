import { Command } from 'commander';
import chalk from 'chalk';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ConfigLoader } from '../../config/loader.js';
import { SkillLoader } from '../../skills/loader.js';
import { validateSkill } from '../../skills/validator.js';
import { getSkillsDir } from '../../utils/paths.js';

export function createSkillsCommand(): Command {
    const cmd = new Command('skills')
        .description('Manage skills');

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
                console.log(chalk.dim('  Create one: agent skills create <name>\n'));
                return;
            }

            console.log(chalk.bold.cyan('\nInstalled Skills\n'));
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

    cmd
        .command('install <source>')
        .description('Install a skill from a local path or registry')
        .action(async (source: string) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();
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
        });

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

            // Run validation
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

    cmd
        .command('update')
        .description('Update all installed skills')
        .action(async () => {
            console.log(chalk.yellow('\nSkill updates from registry not yet available (Phase 3)'));
            console.log(chalk.dim('  Use `agent skills install ./path` to update from local paths\n'));
        });

    return cmd;
}
