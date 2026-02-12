import type { TriggerConfig } from './types.js';

/**
 * Evaluate whether a trigger should fire
 */
export function evaluateTrigger(trigger: TriggerConfig, event?: TriggerEvent): boolean {
    switch (trigger.type) {
        case 'manual':
            return event?.type === 'manual';
        case 'cron':
            // Cron evaluation is handled by the daemon scheduler
            return event?.type === 'cron';
        case 'fs_change':
            if (event?.type !== 'fs_change' || !event.path) return false;
            if (!trigger.paths || trigger.paths.length === 0) return true;
            return trigger.paths.some((pattern) => matchPath(event.path!, pattern));
        case 'git_event':
            if (event?.type !== 'git_event' || !event.gitEvent) return false;
            if (!trigger.gitEvents) return true;
            return trigger.gitEvents.includes(event.gitEvent);
        case 'webhook':
            return event?.type === 'webhook';
        default:
            return false;
    }
}

export interface TriggerEvent {
    type: 'manual' | 'cron' | 'fs_change' | 'git_event' | 'webhook';
    path?: string;
    gitEvent?: 'commit' | 'push' | 'branch_change';
    payload?: unknown;
}

function matchPath(filePath: string, pattern: string): boolean {
    if (pattern === '**/*') return true;
    const regexStr = pattern
        .replace(/\*\*/g, '{{DOUBLE_STAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{DOUBLE_STAR}}/g, '.*');
    try {
        return new RegExp(`^${regexStr}$`).test(filePath);
    } catch {
        return false;
    }
}
