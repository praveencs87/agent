import { redactSecrets } from '../config/secrets.js';

/**
 * Redact secrets from structured data (re-export for convenience)
 */
export { redactSecrets };

/**
 * Redact environment variables from a string
 */
export function redactEnvVars(text: string, sensitiveKeys: string[] = []): string {
    let result = text;

    const defaultKeys = [
        'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE_KEY',
        'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
    ];

    const keysToRedact = [...defaultKeys, ...sensitiveKeys];

    for (const key of keysToRedact) {
        const value = process.env[key];
        if (value && value.length > 4) {
            result = result.replaceAll(value, `[REDACTED:${key}]`);
        }
    }

    return redactSecrets(result);
}

/**
 * Create a safe copy of an object with secrets redacted
 */
export function redactObject(obj: unknown): unknown {
    if (typeof obj === 'string') return redactSecrets(obj);
    if (Array.isArray(obj)) return obj.map(redactObject);
    if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            if (/key|secret|token|password|credential/i.test(key) && typeof value === 'string') {
                result[key] = value.length > 4
                    ? value.substring(0, 2) + '***' + value.substring(value.length - 2)
                    : '***';
            } else {
                result[key] = redactObject(value);
            }
        }
        return result;
    }
    return obj;
}
