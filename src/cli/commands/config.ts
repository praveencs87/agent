import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigLoader } from '../../config/loader.js';

export function createConfigCommand(): Command {
    const cmd = new Command('config')
        .description('Manage configuration');

    cmd
        .command('get <key>')
        .description('Get a configuration value')
        .action(async (key: string) => {
            try {
                const configLoader = new ConfigLoader();
                await configLoader.load();
                const value = configLoader.getValue(key);

                if (value === undefined) {
                    console.log(chalk.yellow(`\nKey "${key}" not found\n`));
                } else {
                    console.log(
                        typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)
                    );
                }
            } catch (err) {
                console.error(chalk.red(`\nError: ${(err as Error).message}\n`));
                process.exit(1);
            }
        });

    cmd
        .command('set <key> <value>')
        .description('Set a configuration value')
        .action(async (key: string, value: string) => {
            try {
                const configLoader = new ConfigLoader();
                await configLoader.load();

                // Parse value
                let parsed: unknown;
                try {
                    parsed = JSON.parse(value);
                } catch {
                    parsed = value;
                }

                await configLoader.setValue(key, parsed);
                console.log(chalk.green(`\n✓ Set ${key} = ${JSON.stringify(parsed)}\n`));
            } catch (err) {
                console.error(chalk.red(`\nError: ${(err as Error).message}\n`));
                process.exit(1);
            }
        });

    return cmd;
}
