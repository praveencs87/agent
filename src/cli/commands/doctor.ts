import { Command } from 'commander';
import chalk from 'chalk';
import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ConfigLoader } from '../../config/loader.js';
import { LLMRouter } from '../../llm/router.js';
import { getAgentDir } from '../../utils/paths.js';
import { ToolRegistry } from '../../tools/registry.js';
import { registerCoreTools } from './init.js';

const execFileAsync = promisify(execFile);

export function createDoctorCommand(): Command {
    const cmd = new Command('doctor')
        .description('Check system health and configuration')
        .action(async () => {
            console.log(chalk.bold.cyan('\n▶ Agent Runtime Health Check\n'));

            let issues = 0;

            // Check .agent directory
            try {
                await access(getAgentDir());
                console.log(chalk.green('  ✓ .agent/ directory exists'));
            } catch {
                console.log(chalk.red('  ✗ .agent/ directory not found'));
                console.log(chalk.dim('    Run: agent init'));
                issues++;
            }

            // Check config file
            try {
                const configLoader = new ConfigLoader();
                const config = await configLoader.load();
                console.log(chalk.green('  ✓ Configuration loaded'));

                // Check LLM providers
                const router = new LLMRouter(config);
                const available = await router.getAvailableProviders();
                if (available.length > 0) {
                    console.log(chalk.green(`  ✓ LLM providers: ${available.join(', ')}`));
                } else {
                    console.log(chalk.yellow('  ⚠ No LLM providers available'));
                    console.log(chalk.dim('    Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or start Ollama'));
                    issues++;
                }
            } catch (err) {
                console.log(chalk.red(`  ✗ Configuration error: ${(err as Error).message}`));
                issues++;
            }

            // Check tools
            const registry = ToolRegistry.getInstance();
            registerCoreTools(registry);
            const tools = registry.list();
            console.log(chalk.green(`  ✓ Core tools: ${tools.length} registered`));

            // Check git
            try {
                await execFileAsync('git', ['--version']);
                console.log(chalk.green('  ✓ Git is available'));
            } catch {
                console.log(chalk.yellow('  ⚠ Git not found'));
                issues++;
            }

            // Check Node version
            const nodeVersion = process.version;
            const major = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (major >= 18) {
                console.log(chalk.green(`  ✓ Node.js ${nodeVersion}`));
            } else {
                console.log(chalk.red(`  ✗ Node.js ${nodeVersion} (requires >= 18)`));
                issues++;
            }

            // Summary
            console.log();
            if (issues === 0) {
                console.log(chalk.bold.green('✓ All checks passed\n'));
            } else {
                console.log(chalk.bold.yellow(`⚠ ${issues} issue${issues > 1 ? 's' : ''} found\n`));
            }
        });

    return cmd;
}
