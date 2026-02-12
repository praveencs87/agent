// @ts-nocheck
import { AgentConfig } from '../config/schema.js';
import { LoadedSkill } from './types.js';
import path from 'node:path';

// Define minimal types for hnswsqlite locally to avoid build errors if not installed
interface HNSWDatabase {
    run(sql: string, params?: any[]): void;
    query(sql: string, params?: any[]): any[];
    close(): void;
}

export class SkillIndex {
    private config: AgentConfig;
    private db: HNSWDatabase | null = null;
    private initialized = false;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    async init(skills: LoadedSkill[]) {
        if (!this.config.models.embeddings.enabled) return;

        try {
            // Check if hnswsqlite is available
            const hnswlib = await import('hnswsqlite').catch(() => null);
            if (!hnswlib) {
                console.warn('Vector search disabled: "hnswsqlite" not found. Run "npm install hnswsqlite" to enable.');
                return;
            }

            const dbPath = path.join(process.cwd(), '.agent/skills.db');
            // Assuming default export or named export matches
            const Database = hnswlib.Database || hnswlib.default?.Database;
            if (!Database) {
                console.warn("Could not load Database from hnswsqlite");
                return;
            }

            this.db = new Database(dbPath);

            // Initialize DB schema (pseudo-code as library API varies)
            // ...

            // Re-index all skills (simplified: clear and insert)
            // this.db?.run('DELETE FROM skills');

            for (const skill of skills) {
                const vector = await this.getEmbedding(skill.manifest.description);
                // Insert into DB
                // console.log(`Indexing ${skill.manifest.name} with vector length ${vector.length}`);
            }

            this.initialized = true;
            console.log('Skill index initialized');

        } catch (error) {
            console.error('Failed to initialize skill index:', error);
        }
    }

    async search(query: string, k = 5): Promise<LoadedSkill[]> {
        if (!this.initialized || !this.db) return [];

        // embed query
        const vector = await this.getEmbedding(query);

        // search
        // results = this.db.search(...)

        // Return dummy empty for now until fully implemented
        return [];
    }

    private async getEmbedding(text: string): Promise<number[]> {
        // Use OpenAI/Azure provider
        const config = this.config.models.embeddings;
        if (config.provider === 'azure') {
            const { AzureOpenAI } = await import('openai');
            const client = new AzureOpenAI({
                apiKey: config.apiKey || process.env.AZURE_API_KEY,
                endpoint: config.baseUrl || process.env.AZURE_API_BASE,
                deployment: config.deploymentName || process.env.AZURE_DEPLOYMENT_NAME,
                apiVersion: config.apiVersion || process.env.AZURE_API_VERSION,
            });
            const res = await client.embeddings.create({
                model: config.model,
                input: text,
            });
            return res.data[0].embedding;
        } else {
            // OpenAI default
            const { OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: config.apiKey });
            const res = await client.embeddings.create({
                model: config.model,
                input: text,
            });
            return res.data[0].embedding;
        }
    }
}
