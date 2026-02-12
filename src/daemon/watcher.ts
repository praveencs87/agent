import { watch } from 'chokidar';
import { ConfigLoader } from '../config/loader.js';
import { PlanParser } from '../plans/parser.js';
import { evaluateTrigger, type TriggerEvent } from '../plans/triggers.js';

/**
 * File system & git event watcher
 */
export class EventWatcher {
    private watchers: ReturnType<typeof watch>[] = [];

    /**
     * Start watching for file system events
     */
    async start(onTrigger: (planName: string, event: TriggerEvent) => void): Promise<void> {
        const configLoader = new ConfigLoader();
        const config = await configLoader.load();
        const planParser = new PlanParser();

        const plans = await planParser.listPlans();

        for (const planInfo of plans) {
            try {
                const plan = await planParser.parseFile(planInfo.path);

                if (plan.trigger.type === 'fs_change' && plan.trigger.paths) {
                    const watcher = watch(plan.trigger.paths, {
                        cwd: process.cwd(),
                        ignoreInitial: true,
                        awaitWriteFinish: {
                            stabilityThreshold: config.daemon.watcherDebounceMs,
                        },
                    });

                    watcher.on('change', (path) => {
                        const event: TriggerEvent = { type: 'fs_change', path };
                        if (evaluateTrigger(plan.trigger, event)) {
                            onTrigger(plan.name, event);
                        }
                    });

                    watcher.on('add', (path) => {
                        const event: TriggerEvent = { type: 'fs_change', path };
                        if (evaluateTrigger(plan.trigger, event)) {
                            onTrigger(plan.name, event);
                        }
                    });

                    this.watchers.push(watcher);
                }
            } catch {
                // Skip invalid plans
            }
        }
    }

    /**
     * Stop all watchers
     */
    async stop(): Promise<void> {
        for (const watcher of this.watchers) {
            await watcher.close();
        }
        this.watchers = [];
    }
}
