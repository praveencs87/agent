/**
 * Secrets management: OS keychain integration with fallback
 * Handles API key storage, retrieval, and redaction
 */

// List of well-known secret patterns for auto-redaction
const SECRET_PATTERNS = [
    /sk-[a-zA-Z0-9_-]{20,}/g,                // OpenAI
    /sk-ant-[a-zA-Z0-9_-]{20,}/g,            // Anthropic
    /ghp_[a-zA-Z0-9]{36}/g,                  // GitHub PAT
    /gho_[a-zA-Z0-9]{36}/g,                  // GitHub OAuth
    /glpat-[a-zA-Z0-9_-]{20,}/g,             // GitLab PAT
    /xoxb-[a-zA-Z0-9-]+/g,                   // Slack Bot
    /xoxp-[a-zA-Z0-9-]+/g,                   // Slack User
    /AKIA[0-9A-Z]{16}/g,                     // AWS Access Key
    /[a-f0-9]{32,}/g,                        // Generic hex tokens (>32 chars)
];

/**
 * Redact secrets from a string
 */
export function redactSecrets(text: string): string {
    let result = text;
    for (const pattern of SECRET_PATTERNS) {
        result = result.replace(pattern, (match) => {
            if (match.length < 8) return match;
            return match.substring(0, 4) + '***' + match.substring(match.length - 4);
        });
    }
    return result;
}

/**
 * In-memory secrets store (fallback when OS keychain is unavailable)
 */
class SecretsStore {
    private secrets: Map<string, string> = new Map();
    private keytarAvailable: boolean | null = null;

    /**
     * Store a secret
     */
    async set(key: string, value: string): Promise<void> {
        if (await this.useKeytar()) {
            try {
                const keytar = await import('keytar');
                await keytar.default.setPassword('agent-runtime', key, value);
                return;
            } catch {
                // Fallback to in-memory
            }
        }
        this.secrets.set(key, value);
    }

    /**
     * Retrieve a secret
     */
    async get(key: string): Promise<string | null> {
        if (await this.useKeytar()) {
            try {
                const keytar = await import('keytar');
                return await keytar.default.getPassword('agent-runtime', key);
            } catch {
                // Fallback to in-memory
            }
        }
        return this.secrets.get(key) ?? null;
    }

    /**
     * Delete a secret
     */
    async delete(key: string): Promise<void> {
        if (await this.useKeytar()) {
            try {
                const keytar = await import('keytar');
                await keytar.default.deletePassword('agent-runtime', key);
                return;
            } catch {
                // Fallback to in-memory
            }
        }
        this.secrets.delete(key);
    }

    private async useKeytar(): Promise<boolean> {
        if (this.keytarAvailable !== null) return this.keytarAvailable;
        try {
            await import('keytar');
            this.keytarAvailable = true;
        } catch {
            this.keytarAvailable = false;
        }
        return this.keytarAvailable;
    }
}

export const secretsStore = new SecretsStore();
