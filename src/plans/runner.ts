import type { Plan, PlanRun } from './types.js';
import type { ExecutionContext } from '../tools/types.js';
import { ExecutionEngine } from '../engine/executor.js';
import { AuditLogger } from '../logging/audit-log.js';
import { auditEmitter, AuditEventType } from '../policy/audit.js';
import { generateRunId } from '../utils/paths.js';

/**
 * Plan runner — executes plan steps sequentially
 */
export class PlanRunner {
    private engine: ExecutionEngine;

    constructor(engine: ExecutionEngine) {
        this.engine = engine;
    }

    /**
     * Execute a plan
     */
    async run(plan: Plan, ctx: ExecutionContext): Promise<PlanRun> {
        const runId = ctx.runId ?? generateRunId();
        const auditLogger = new AuditLogger(runId, plan.name);
        await auditLogger.init();

        const planRun: PlanRun = {
            runId,
            planName: plan.name,
            status: 'running',
            steps: plan.steps.map((s) => ({
                stepId: s.id,
                status: 'pending' as const,
            })),
            startedAt: new Date().toISOString(),
            triggeredBy: 'cli',
        };

        auditEmitter.emit(AuditEventType.RUN_START, {
            runId,
            planName: plan.name,
            stepCount: plan.steps.length,
        });

        ctx.onProgress?.(`Starting plan: ${plan.name} (${plan.steps.length} steps)`);

        try {
            for (const step of plan.steps) {
                const stepRun = planRun.steps.find((s) => s.stepId === step.id)!;

                // Check dependencies
                if (step.dependsOn) {
                    const unmetDeps = step.dependsOn.filter((depId) => {
                        const dep = planRun.steps.find((s) => s.stepId === depId);
                        return !dep || dep.status !== 'completed';
                    });
                    if (unmetDeps.length > 0) {
                        stepRun.status = 'skipped';
                        stepRun.error = `Unmet dependencies: ${unmetDeps.join(', ')}`;
                        continue;
                    }
                }

                ctx.onProgress?.(`Step ${step.id}: ${step.name}`);
                stepRun.status = 'running';

                auditEmitter.emit(AuditEventType.STEP_START, {
                    stepId: step.id,
                    skill: step.skill,
                    tool: step.tool,
                });

                auditLogger.addStep({
                    stepId: step.id,
                    skill: step.skill,
                    tool: step.tool,
                    startedAt: new Date().toISOString(),
                    status: 'running',
                    input: step.args,
                });

                // Execute the step
                const result = await this.engine.executeStep(step, ctx);

                stepRun.status = result.success ? 'completed' : 'failed';
                stepRun.output = result.output;
                stepRun.error = result.error;
                stepRun.durationMs = result.durationMs;

                // Run verification
                if (step.verify && result.success) {
                    const verification = await this.engine.verify(step.verify, ctx);
                    stepRun.verification = verification;

                    if (!verification.passed) {
                        stepRun.status = 'failed';
                        stepRun.error = `Verification failed: ${verification.details}`;
                    }
                }

                auditLogger.updateStep(step.id, {
                    completedAt: new Date().toISOString(),
                    status: stepRun.status,
                    output: result.output as Record<string, unknown>,
                    error: stepRun.error,
                    verification: stepRun.verification,
                });

                auditEmitter.emit(
                    stepRun.status === 'completed'
                        ? AuditEventType.STEP_COMPLETE
                        : AuditEventType.STEP_FAILED,
                    { stepId: step.id, status: stepRun.status, error: stepRun.error }
                );

                // Handle failures
                if (stepRun.status === 'failed') {
                    const action = step.onFailure ?? 'abort';

                    if (action === 'retry' && (step.retries ?? 0) > 0) {
                        // Retry logic
                        let retried = false;
                        for (let attempt = 1; attempt <= (step.retries ?? 0); attempt++) {
                            ctx.onProgress?.(`Retrying step ${step.id} (attempt ${attempt}/${step.retries})`);
                            const retryResult = await this.engine.executeStep(step, ctx);
                            if (retryResult.success) {
                                stepRun.status = 'completed';
                                stepRun.output = retryResult.output;
                                stepRun.error = undefined;
                                retried = true;
                                break;
                            }
                        }
                        if (!retried) {
                            planRun.status = 'failed';
                            break;
                        }
                    } else if (action === 'abort') {
                        planRun.status = 'failed';
                        break;
                    }
                    // 'skip' falls through to next step
                }
            }

            if (planRun.status === 'running') {
                planRun.status = 'completed';
            }
        } catch (err) {
            planRun.status = 'failed';
        }

        planRun.completedAt = new Date().toISOString();

        auditEmitter.emit(AuditEventType.RUN_COMPLETE, {
            runId,
            status: planRun.status,
            stepsCompleted: planRun.steps.filter((s) => s.status === 'completed').length,
            stepsFailed: planRun.steps.filter((s) => s.status === 'failed').length,
        });

        await auditLogger.complete(planRun.status === 'completed' ? 'completed' : 'failed');

        return planRun;
    }

    /**
     * Create a proposed run (doesn't execute, waits for approval)
     */
    async propose(plan: Plan, _ctx: ExecutionContext): Promise<PlanRun> {
        const runId = generateRunId();
        const auditLogger = new AuditLogger(runId, plan.name);
        await auditLogger.init();

        const planRun: PlanRun = {
            runId,
            planName: plan.name,
            status: 'proposed',
            steps: plan.steps.map((s) => ({
                stepId: s.id,
                status: 'pending' as const,
            })),
            startedAt: new Date().toISOString(),
            triggeredBy: 'propose',
        };

        await auditLogger.save();
        return planRun;
    }
}
