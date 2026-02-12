/**
 * MCP server types for Model Context Protocol integration
 */
export interface McpToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

export interface McpToolResult {
    content: { type: 'text'; text: string }[];
    isError?: boolean;
}

export interface McpServerOptions {
    mode: 'stdio' | 'http';
    host?: string;
    port?: number;
}
