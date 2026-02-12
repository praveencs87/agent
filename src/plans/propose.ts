import type { Plan, PlanRun } from './types.js';
import { writeFile, readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { generateRunId, getRunsDir } from '../utils/paths.js';

/**
 * Propose mode — creates a draft run for user review before execution
 */
export class PlanProposer {
    /**
     * Create a proposed run draft
     */
    async createProposal(plan: Plan, triggeredBy: string): Promise<PlanRun> {
        const runId = generateRunId();
        const runDir = path.join(getRunsDir(), runId);
        await mkdir(runDir, { recursive: true });

        const planRun: PlanRun = {
            runId,
            planName: plan.name,
            status: 'proposed',
            steps: plan.steps.map((s) => ({
                stepId: s.id,
                status: 'pending' as const,
            })),
            startedAt: new Date().toISOString(),
            triggeredBy,
        };

        // Save proposal to disk
        await writeFile(
            path.join(runDir, 'proposal.json'),
            JSON.stringify({ plan, run: planRun }, null, 2),
            'utf-8'
        );

        return planRun;
    }

    /**
     * Load a proposal by run ID
     */
    async loadProposal(runId: string): Promise<{ plan: Plan; run: PlanRun } | null> {
        const proposalPath = path.join(getRunsDir(), runId, 'proposal.json');
        try {
            const content = await readFile(proposalPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * List all pending proposals
     */
    async listProposed(): Promise<PlanRun[]> {
        const runsDir = getRunsDir();
        const proposed: PlanRun[] = [];

        try {
            const entries = await readdir(runsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const proposalPath = path.join(runsDir, entry.name, 'proposal.json');
                try {
                    const content = await readFile(proposalPath, 'utf-8');
                    const data = JSON.parse(content);
                    if (data.run.status === 'proposed') {
                        proposed.push(data.run);
                    }
                } catch {
                    continue;
                }
            }
        } catch {
            // runs dir doesn't exist
        }

        return proposed;
    }

    /**
     * Approve a proposal (changes status from proposed → pending)
     */
    async approve(runId: string): Promise<boolean> {
        const proposal = await this.loadProposal(runId);
        if (!proposal || proposal.run.status !== 'proposed') return false;

        proposal.run.status = 'pending';
        const proposalPath = path.join(getRunsDir(), runId, 'proposal.json');
        await writeFile(proposalPath, JSON.stringify(proposal, null, 2), 'utf-8');

        return true;
    }
}
