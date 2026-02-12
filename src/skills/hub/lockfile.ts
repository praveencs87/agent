/**
 * Skill lockfile management (Phase 3)
 */
export interface LockfileEntry {
    name: string;
    version: string;
    hash: string;
    installedAt: string;
}

export class LockfileManager {
    async read(): Promise<LockfileEntry[]> {
        // Phase 3
        return [];
    }

    async write(_entries: LockfileEntry[]): Promise<void> {
        // Phase 3
    }

    async addEntry(_entry: LockfileEntry): Promise<void> {
        // Phase 3
    }
}
