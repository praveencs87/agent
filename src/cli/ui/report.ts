import chalk from 'chalk';
import type { PlanRun } from '../../plans/types.js';

/**
 * Render a run summary report to the terminal
 */
export function renderRunReport(run: PlanRun): void {
    console.log();
    console.log(chalk.bold.white('═══════════════════════════════════════════'));
    console.log(chalk.bold.white('  Run Report'));
    console.log(chalk.bold.white('═══════════════════════════════════════════'));
    console.log();

    // Status
    const statusIcon = run.status === 'completed' ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${chalk.dim('Run ID:')}    ${run.runId}`);
    console.log(`  ${chalk.dim('Plan:')}      ${run.planName}`);
    console.log(`  ${chalk.dim('Status:')}    ${statusIcon} ${statusColor(run.status)}`);
    console.log(`  ${chalk.dim('Started:')}   ${run.startedAt ?? 'N/A'}`);
    console.log(`  ${chalk.dim('Completed:')} ${run.completedAt ?? 'N/A'}`);
    console.log();

    // Steps
    console.log(chalk.bold.white('  Steps'));
    console.log(chalk.dim('  ' + '─'.repeat(50)));

    for (const step of run.steps) {
        const icon = stepIcon(step.status);
        const dur = step.durationMs ? chalk.dim(` (${step.durationMs}ms)`) : '';
        console.log(`    ${icon} ${step.stepId}${dur}`);
        if (step.error) {
            console.log(chalk.red(`      Error: ${step.error}`));
        }
        if (step.verification) {
            const vIcon = step.verification.passed ? chalk.green('✓') : chalk.red('✗');
            console.log(`      ${vIcon} Verification: ${step.verification.details.split('\n')[0]}`);
        }
    }

    console.log();

    // Summary stats
    const completed = run.steps.filter((s) => s.status === 'completed').length;
    const failed = run.steps.filter((s) => s.status === 'failed').length;
    const skipped = run.steps.filter((s) => s.status === 'skipped').length;
    console.log(chalk.dim(`  Steps: `) +
        chalk.green(`${completed} completed`) + chalk.dim(', ') +
        chalk.red(`${failed} failed`) + chalk.dim(', ') +
        chalk.yellow(`${skipped} skipped`)
    );
    console.log();

    // Next actions
    if (run.status === 'failed') {
        console.log(chalk.bold.white('  Suggested Actions'));
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        console.log(`    ${chalk.cyan('•')} Review the error above`);
        console.log(`    ${chalk.cyan('•')} Check audit logs: ${chalk.dim(`agent plan show ${run.runId}`)}`);
        console.log(`    ${chalk.cyan('•')} Retry the plan: ${chalk.dim(`agent plan run ${run.planName}`)}`);
    } else if (run.status === 'completed') {
        console.log(chalk.bold.white('  Suggested Actions'));
        console.log(chalk.dim('  ' + '─'.repeat(50)));
        console.log(`    ${chalk.cyan('•')} Review changes: ${chalk.dim('git diff')}`);
        console.log(`    ${chalk.cyan('•')} View full log: ${chalk.dim(`agent plan show ${run.runId}`)}`);
    }

    console.log();
    console.log(chalk.bold.white('═══════════════════════════════════════════'));
    console.log();
}

function statusColor(status: string): string {
    switch (status) {
        case 'completed': return chalk.green(status);
        case 'failed': return chalk.red(status);
        case 'running': return chalk.cyan(status);
        case 'proposed': return chalk.yellow(status);
        case 'aborted': return chalk.red(status);
        default: return chalk.dim(status);
    }
}

function stepIcon(status: string): string {
    switch (status) {
        case 'completed': return chalk.green('✓');
        case 'failed': return chalk.red('✗');
        case 'running': return chalk.cyan('▶');
        case 'skipped': return chalk.yellow('○');
        default: return chalk.dim('·');
    }
}
