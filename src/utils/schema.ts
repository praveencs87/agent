import { z } from 'zod';

/**
 * Validate data against a zod schema with friendly error messages
 */
export function validateSchema<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context?: string
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        const prefix = context ? `${context}: ` : '';
        return `${prefix}${path ? `${path}: ` : ''}${issue.message}`;
    });
    return { success: false, errors };
}

/**
 * Create a JSON Schema-like object from a zod schema (simplified)
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape as Record<string, z.ZodType>;
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = zodToJsonSchema(value);
            // Default fields are optional in JSON schema
            if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
                required.push(key);
            }
        }
        return { type: 'object', properties, required };
    }
    if (schema instanceof z.ZodString) {
        const def = (schema as z.ZodString)._def;
        const result: Record<string, unknown> = { type: 'string' };
        if (def.description) result.description = def.description;
        return result;
    }
    if (schema instanceof z.ZodNumber) return { type: 'number' };
    if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
    if (schema instanceof z.ZodArray) {
        return {
            type: 'array',
            items: zodToJsonSchema((schema as z.ZodArray<z.ZodType>)._def.type),
        };
    }
    if (schema instanceof z.ZodOptional) {
        return zodToJsonSchema((schema as z.ZodOptional<z.ZodType>)._def.innerType);
    }
    if (schema instanceof z.ZodDefault) {
        return zodToJsonSchema((schema as z.ZodDefault<z.ZodType>)._def.innerType);
    }
    if (schema instanceof z.ZodEffects) {
        return zodToJsonSchema((schema as z.ZodEffects<z.ZodType>)._def.schema);
    }
    if (schema instanceof z.ZodEnum) {
        return { type: 'string', enum: (schema as z.ZodEnum<[string, ...string[]]>)._def.values };
    }
    // Fallback for unknown types (e.g. ZodAny, ZodUnknown) - use empty schema which matches anything, or string if safest
    return { type: 'string' };
}
