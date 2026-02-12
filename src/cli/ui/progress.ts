import chalk from 'chalk';

/**
 * Progress display using chalk (no ora for simpler output)
 */
export class ProgressDisplay {
    private stepCount: number = 0;
    private totalSteps: number = 0;

    start(title: string, totalSteps: number): void {
        this.totalSteps = totalSteps;
        this.stepCount = 0;
        console.log();
        console.log(chalk.bold.cyan(`▶ ${title}`));
        console.log(chalk.dim('─'.repeat(60)));
    }

    step(name: string): void {
        this.stepCount++;
        console.log(chalk.yellow(`  ${this.stepCount}/${this.totalSteps}`) + chalk.white(` ${name}`));
    }

    success(message: string): void {
        console.log(chalk.green(`  ✓ ${message}`));
    }

    warning(message: string): void {
        console.log(chalk.yellow(`  ⚠ ${message}`));
    }

    error(message: string): void {
        console.log(chalk.red(`  ✗ ${message}`));
    }

    info(message: string): void {
        console.log(chalk.dim(`  ℹ ${message}`));
    }

    complete(message: string): void {
        console.log(chalk.dim('─'.repeat(60)));
        console.log(chalk.bold.green(`✓ ${message}`));
        console.log();
    }

    fail(message: string): void {
        console.log(chalk.dim('─'.repeat(60)));
        console.log(chalk.bold.red(`✗ ${message}`));
        console.log();
    }
}

export const progress = new ProgressDisplay();
