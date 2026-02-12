import { Command } from 'commander';
import { ConfigLoader } from '../../config/loader.js';
import { startMcpServer } from '../../mcp/server.js';

export function createMcpCommand(): Command {
    const cmd = new Command('mcp')
        .description('Start MCP server for editor integration')
        .option('--stdio', 'Use stdio transport (default)')
        .option('--http <hostport>', 'Use HTTP transport (host:port)')
        .action(async (options: { stdio?: boolean; http?: string }) => {
            const configLoader = new ConfigLoader();
            const config = await configLoader.load();

            if (options.http) {
                const [host, portStr] = options.http.split(':');
                await startMcpServer(config, {
                    mode: 'http',
                    host: host || '127.0.0.1',
                    port: parseInt(portStr || '3100', 10),
                });
            } else {
                await startMcpServer(config, { mode: 'stdio' });
            }
        });

    return cmd;
}
