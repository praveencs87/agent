import { Command } from 'commander';
import chalk from 'chalk';
import { DaemonManager } from '../../daemon/manager.js';

export function createDaemonCommand(): Command {
    const cmd = new Command('daemon')
        .description('Manage the agent daemon');

    const manager = new DaemonManager();

    cmd
        .command('start')
        .description('Start the agent daemon')
        .action(async () => {
            try {
                const result = await manager.start();
                console.log(chalk.green(`\n✓ ${result.message}\n`));
            } catch (err) {
                console.error(chalk.red(`\n✗ Failed to start daemon: ${(err as Error).message}\n`));
                process.exit(1);
            }
        });

    cmd
        .command('stop')
        .description('Stop the agent daemon')
        .action(async () => {
            const result = await manager.stop();
            console.log(chalk.cyan(`\n${result.message}\n`));
        });

    cmd
        .command('status')
        .description('Check daemon status')
        .action(async () => {
            const status = await manager.status();
            if (status.running) {
                console.log(chalk.green(`\n✓ Daemon is running (PID: ${status.pid})\n`));
            } else {
                console.log(chalk.yellow(`\n○ Daemon is not running\n`));
                console.log(chalk.dim('  Start with: agent daemon start\n'));
            }
        });

    return cmd;
}
