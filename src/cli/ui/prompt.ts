import { createInterface } from 'node:readline';
import chalk from 'chalk';
import type { ActionDescriptor } from '../../tools/types.js';

/**
 * Interactive approval prompt for permission-gated actions
 */
export async function promptApproval(action: ActionDescriptor): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    console.log();
    console.log(chalk.yellow.bold('⚠ Approval Required'));
    console.log(chalk.white(`  Action: ${action.description}`));
    console.log(chalk.white(`  Tool:   ${action.tool}`));
    console.log(chalk.white(`  Risk:   ${riskBadge(action.riskLevel)}`));

    if (action.args) {
        const argsStr = JSON.stringify(action.args, null, 2)
            .split('\n')
            .map((l) => `         ${l}`)
            .join('\n');
        console.log(chalk.dim(`  Args:${argsStr}`));
    }

    console.log(chalk.white(`  Permissions: ${action.permissions.join(', ')}`));
    console.log();

    return new Promise<boolean>((resolve) => {
        rl.question(
            chalk.cyan('  Allow this action? ') + chalk.dim('(y/n/a=always) ') + chalk.cyan('> '),
            (answer) => {
                rl.close();
                const normalized = answer.trim().toLowerCase();
                resolve(normalized === 'y' || normalized === 'yes' || normalized === 'a' || normalized === 'always');
            }
        );
    });
}

/**
 * Simple yes/no prompt
 */
export async function promptConfirm(message: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    return new Promise<boolean>((resolve) => {
        rl.question(chalk.cyan(`${message} `) + chalk.dim('(y/n) ') + chalk.cyan('> '), (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
}

function riskBadge(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
        case 'low':
            return chalk.green('LOW');
        case 'medium':
            return chalk.yellow('MEDIUM');
        case 'high':
            return chalk.red.bold('HIGH');
    }
}
