import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { AgentConfig } from '../config/schema.js';
import { createMcpHandlers } from './handlers.js';
import type { McpServerOptions } from './types.js';

/**
 * MCP Server — exposes agent tools to editors like Cursor, Windsurf, etc.
 * Uses the same policy engine as CLI, logs which client initiated actions.
 */
export async function startMcpServer(
    config: AgentConfig,
    options: McpServerOptions
): Promise<void> {
    const server = new Server(
        {
            name: 'agent-runtime',
            version: '0.1.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    const handlers = await createMcpHandlers(config);

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: handlers.getToolDefinitions(),
        };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return handlers.handleToolCall(name, args ?? {});
    });

    if (options.mode === 'stdio') {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    } else if (options.mode === 'http') {
        // HTTP mode will use SSE transport (Phase 2)
        console.error('HTTP transport not yet implemented. Use --stdio mode.');
        process.exit(1);
    }
}
