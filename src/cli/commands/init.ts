import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { getAgentDir, getSkillsDir, getPlansDir, getRunsDir, getLogsDir, getPluginsDir, getConfigPath } from '../../utils/paths.js';
import { DEFAULT_CONFIG } from '../../config/defaults.js';
import { ToolRegistry } from '../../tools/registry.js';
import { fsTools } from '../../tools/core/fs.js';
import { cmdTools } from '../../tools/core/cmd.js';
import { gitTools } from '../../tools/core/git.js';
import { projectTools } from '../../tools/core/project.js';
import type { ToolDefinition } from '../../tools/types.js';

/**
 * Register all core tools in the registry
 */
export function registerCoreTools(registry: ToolRegistry): void {
    const allTools: ToolDefinition[] = [
        ...fsTools as ToolDefinition[],
        ...cmdTools as ToolDefinition[],
        ...gitTools as ToolDefinition[],
        ...projectTools as ToolDefinition[],
    ];

    for (const tool of allTools) {
        if (!registry.has(tool.name)) {
            registry.register(tool);
        }
    }
}

export function createInitCommand(): Command {
    const cmd = new Command('init')
        .description('Initialize agent configuration in the current project')
        .action(async () => {
            console.log(chalk.bold.cyan('\n▶ Initializing Agent Runtime\n'));

            const agentDir = getAgentDir();
            const dirs = [
                agentDir,
                getSkillsDir(),
                getPlansDir(),
                getRunsDir(),
                getLogsDir(),
                getPluginsDir(),
            ];

            // Create directories
            for (const dir of dirs) {
                await mkdir(dir, { recursive: true });
                console.log(chalk.green('  ✓ Created ') + chalk.dim(path.relative(process.cwd(), dir) + '/'));
            }

            // Create config file
            const configPath = getConfigPath();
            await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
            console.log(chalk.green('  ✓ Created ') + chalk.dim('agent.config.json'));

            // Create example plan
            const examplePlan = `name: example
description: An example plan showing the plan file structure
mode: execute

goals:
  - id: goal-1
    description: Demonstrate plan execution
    successCriteria:
      - "Output file is created"
    riskLevel: low

steps:
  - id: step-1
    name: Detect project
    tool: project.detect
    args: {}
    verify:
      command: "echo ok"

  - id: step-2
    name: List files
    tool: fs.list
    args:
      path: "."
      recursive: false

policy:
  approvals: per_step

trigger:
  type: manual
`;

            await writeFile(
                path.join(getPlansDir(), 'example.plan.yaml'),
                examplePlan,
                'utf-8'
            );
            console.log(chalk.green('  ✓ Created ') + chalk.dim('.agent/plans/example.plan.yaml'));

            // Create example skill
            const skillDir = path.join(getSkillsDir(), 'hello-world');
            await mkdir(skillDir, { recursive: true });

            await writeFile(
                path.join(skillDir, 'skill.json'),
                JSON.stringify({
                    name: 'hello-world',
                    version: '1.0.0',
                    description: 'A simple example skill',
                    inputs: {},
                    tools: ['fs.read'],
                    permissions: { required: ['filesystem.read'] },
                    entrypoint: 'prompt.md',
                    state: 'approved',
                }, null, 2) + '\n',
                'utf-8'
            );
            await writeFile(
                path.join(skillDir, 'prompt.md'),
                '# Hello World\n\nRead the README.md file and summarize its contents.\n',
                'utf-8'
            );
            console.log(chalk.green('  ✓ Created ') + chalk.dim('.agent/skills/hello-world/'));

            // Create .gitignore for .agent
            await writeFile(
                path.join(agentDir, '.gitignore'),
                'runs/\nlogs/\ndaemon.pid\n.secrets\n',
                'utf-8'
            );
            console.log(chalk.green('  ✓ Created ') + chalk.dim('.agent/.gitignore'));

            console.log(chalk.bold.green('\n✓ Agent Runtime initialized!\n'));
            console.log(chalk.dim('  Next steps:'));
            console.log(chalk.dim('    1. Configure model providers in agent.config.json'));
            console.log(chalk.dim('    2. Run: agent plan run example'));
            console.log(chalk.dim('    3. Create skills: agent skills create <name>'));
            console.log();
        });

    return cmd;
}
