/**
 * Permission category type definitions
 */
export type PermissionCategory =
    | 'filesystem'
    | 'filesystem.read'
    | 'filesystem.write'
    | 'exec'
    | 'network'
    | 'ui_automation'
    | 'secrets';

export type ApprovalAction = 'allow' | 'deny' | 'confirm';

export interface PermissionResult {
    allowed: boolean;
    reason?: string;
    requiresApproval: boolean;
}

export interface ScopeCheckResult {
    inScope: boolean;
    violation?: string;
}
