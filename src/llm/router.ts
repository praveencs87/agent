import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';
import type { AgentConfig } from '../config/schema.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OllamaProvider } from './providers/ollama.js';
import { AzureOpenAIProvider } from './providers/azure.js';

/**
 * LLM Router — selects and routes requests to the appropriate provider
 * with configurable offline-first, online fallback, and per-skill overrides
 */
export class LLMRouter {
    private providers: Map<string, LLMProvider> = new Map();
    private config: AgentConfig;

    constructor(config: AgentConfig) {
        this.config = config;
        this.initProviders();
    }

    /**
     * Send a chat request to the best available provider
     */
    async chat(request: LLMRequest): Promise<LLMResponse> {
        // Check for skill-specific provider override
        if (request.skillName) {
            const override = this.config.models.routing.skillOverrides[request.skillName];
            if (override) {
                const provider = this.providers.get(override);
                if (provider && await provider.isAvailable()) {
                    return provider.chat(request);
                }
            }
        }

        // Determine provider order based on routing config
        const chain = this.config.models.routing.offlineFirst
            ? this.getOfflineFirstChain()
            : this.config.models.routing.fallbackChain;

        // Try providers in order
        for (const providerName of chain) {
            const provider = this.providers.get(providerName);
            if (!provider) continue;

            try {
                if (await provider.isAvailable()) {
                    return await provider.chat(request);
                }
            } catch (err) {
                // Log error and try next provider
                console.error(`Provider ${providerName} failed: ${(err as Error).message}`);
            }
        }

        throw new Error(
            `No LLM provider available. Tried: ${chain.join(', ')}. ` +
            'Configure providers in agent.config.json or set API key environment variables.'
        );
    }

    /**
     * Check which providers are available
     */
    async getAvailableProviders(): Promise<string[]> {
        const available: string[] = [];
        for (const [name, provider] of this.providers) {
            if (await provider.isAvailable()) {
                available.push(name);
            }
        }
        return available;
    }

    /**
     * Get a specific provider
     */
    getProvider(name: string): LLMProvider | undefined {
        return this.providers.get(name);
    }

    // ─── Private ───

    private initProviders(): void {
        for (const [name, providerConfig] of Object.entries(this.config.models.providers)) {
            switch (providerConfig.type) {
                case 'openai':
                    this.providers.set(name, new OpenAIProvider(providerConfig));
                    break;
                case 'anthropic':
                    this.providers.set(name, new AnthropicProvider(providerConfig));
                    break;
                case 'ollama':
                    this.providers.set(name, new OllamaProvider(providerConfig));
                    break;
                case 'azure':
                    this.providers.set(name, new AzureOpenAIProvider(providerConfig));
                    break;
            }
        }
    }

    private getOfflineFirstChain(): string[] {
        // Put local providers first
        const local: string[] = [];
        const online: string[] = [];

        for (const [name, config] of Object.entries(this.config.models.providers)) {
            if (config.type === 'ollama') {
                local.push(name);
            } else {
                online.push(name);
            }
        }

        return [...local, ...online];
    }
}
