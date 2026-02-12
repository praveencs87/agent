import path from 'node:path';
import type { AgentConfig } from '../config/schema.js';
import type { ScopeCheckResult } from './types.js';

/**
 * Scope controls: filesystem allowlist, command allowlist, domain allowlist
 */
export class ScopeChecker {
    private config: AgentConfig;
    private projectRoot: string;

    constructor(config: AgentConfig, projectRoot: string) {
        this.config = config;
        this.projectRoot = projectRoot;
    }

    /**
     * Check if a filesystem path is within the allowed scope
     */
    checkFilesystemScope(filePath: string): ScopeCheckResult {
        const absPath = path.resolve(this.projectRoot, filePath);
        const relPath = path.relative(this.projectRoot, absPath);

        // Prevent path traversal outside project
        if (relPath.startsWith('..')) {
            return { inScope: false, violation: `Path "${filePath}" is outside project root` };
        }

        const allowlist = this.config.policy.filesystemAllowlist;
        if (allowlist.length === 0) {
            return { inScope: false, violation: 'Filesystem allowlist is empty' };
        }

        // Check if path matches any allowlist pattern
        const matches = allowlist.some((pattern) => this.matchGlob(relPath, pattern));
        if (!matches) {
            return { inScope: false, violation: `Path "${relPath}" not in filesystem allowlist` };
        }

        return { inScope: true };
    }

    /**
     * Check if a command is within the allowed scope
     */
    checkCommandScope(command: string): ScopeCheckResult {
        const allowlist = this.config.policy.commandAllowlist;

        // If allowlist is empty, all commands require approval (but aren't blocked)
        if (allowlist.length === 0) {
            return { inScope: true };
        }

        const matches = allowlist.some((pattern) => {
            if (pattern === command) return true;
            try {
                return new RegExp(pattern).test(command);
            } catch {
                return false;
            }
        });

        if (!matches) {
            return { inScope: false, violation: `Command "${command}" not in command allowlist` };
        }

        return { inScope: true };
    }

    /**
     * Check if a domain is within the allowed scope
     */
    checkDomainScope(domain: string): ScopeCheckResult {
        const allowlist = this.config.policy.domainAllowlist;

        if (allowlist.length === 0) {
            return { inScope: true };
        }

        const matches = allowlist.some(
            (d) => domain === d || domain.endsWith(`.${d}`)
        );

        if (!matches) {
            return { inScope: false, violation: `Domain "${domain}" not in domain allowlist` };
        }

        return { inScope: true };
    }

    /**
     * Simple glob match (supports ** and *)
     */
    private matchGlob(str: string, pattern: string): boolean {
        if (pattern === '**/*' || pattern === '*') return true;
        const regexStr = pattern
            .replace(/\*\*/g, '{{DOUBLE_STAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/{{DOUBLE_STAR}}/g, '.*');
        try {
            return new RegExp(`^${regexStr}$`).test(str);
        } catch {
            return false;
        }
    }
}
