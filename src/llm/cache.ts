/**
 * Prompt and response cache for LLM calls
 */
const cache = new Map<string, { response: unknown; timestamp: number }>();
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get a cached response
 */
export function getCachedResponse(key: string, ttl: number = DEFAULT_TTL): unknown | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
        cache.delete(key);
        return null;
    }
    return entry.response;
}

/**
 * Cache a response
 */
export function setCachedResponse(key: string, response: unknown): void {
    cache.set(key, { response, timestamp: Date.now() });
}

/**
 * Clear the cache
 */
export function clearCache(): void {
    cache.clear();
}

/**
 * Generate a cache key from a request
 */
export function generateCacheKey(messages: { role: string; content: string }[]): string {
    const content = messages.map((m) => `${m.role}:${m.content}`).join('|');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `llm_${Math.abs(hash).toString(36)}`;
}
