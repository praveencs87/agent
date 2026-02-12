import pino from 'pino';
import { redactSecrets } from '../config/secrets.js';

/**
 * Create a configured pino logger instance
 */
export function createLogger(options?: { level?: string; pretty?: boolean }): pino.Logger {
    const level = options?.level ?? process.env['AGENT_LOG_LEVEL'] ?? 'info';

    if (options?.pretty ?? process.env['NODE_ENV'] !== 'production') {
        return pino({
            level,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
            formatters: {
                log(obj: Record<string, unknown>) {
                    return redactObject(obj);
                },
            },
        });
    }

    return pino({
        level,
        formatters: {
            log(obj: Record<string, unknown>) {
                return redactObject(obj);
            },
        },
    });
}

/**
 * Redact secrets from all string values in an object
 */
function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = redactSecrets(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = redactObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Default logger instance
 */
export const logger = createLogger();
