import { EventEmitter } from 'node:events';

/**
 * Audit event types
 */
export enum AuditEventType {
    TOOL_CALL = 'tool_call',
    TOOL_RESULT = 'tool_result',
    PERMISSION_CHECK = 'permission_check',
    PERMISSION_DENIED = 'permission_denied',
    APPROVAL_GRANTED = 'approval_granted',
    APPROVAL_DENIED = 'approval_denied',
    STEP_START = 'step_start',
    STEP_COMPLETE = 'step_complete',
    STEP_FAILED = 'step_failed',
    RUN_START = 'run_start',
    RUN_COMPLETE = 'run_complete',
    SKILL_LOADED = 'skill_loaded',
    PLAN_PARSED = 'plan_parsed',
    DIFF_GENERATED = 'diff_generated',
}

export interface AuditEvent {
    type: AuditEventType;
    timestamp: string;
    data: Record<string, unknown>;
}

/**
 * Typed audit event emitter
 */
class AuditEmitter extends EventEmitter {
    emit(type: AuditEventType, data: Record<string, unknown>): boolean {
        const event: AuditEvent = {
            type,
            timestamp: new Date().toISOString(),
            data,
        };
        return super.emit('audit', event);
    }

    onAudit(handler: (event: AuditEvent) => void): void {
        this.on('audit', handler);
    }
}

export const auditEmitter = new AuditEmitter();
