/**
 * Plugin loader — discovers and loads tool plugins
 * Phase 3: browser, desktop, web plugins
 */
import { readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { ToolRegistry } from '../registry.js';
import { getPluginsDir } from '../../utils/paths.js';

export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    tools: string[];
    entrypoint: string;
}

/**
 * Load all plugins from the plugins directory
 */
export async function loadPlugins(_registry: ToolRegistry): Promise<string[]> {
    const pluginsDir = getPluginsDir();
    const loaded: string[] = [];

    try {
        await access(pluginsDir);
    } catch {
        return loaded; // No plugins directory
    }

    const entries = await readdir(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
        try {
            await access(manifestPath);
            // Plugin loading will be implemented in Phase 3
            loaded.push(entry.name);
        } catch {
            // Skip directories without manifest
        }
    }

    return loaded;
}
