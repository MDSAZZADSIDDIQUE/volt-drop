import { z } from 'zod';

type JsonObject = Record<string, unknown>;

/** What @nestjs/swagger expects back from a Standard Schema converter. */
export interface ConvertedSchema {
  readonly schema: unknown;
  readonly components?: Record<string, unknown>;
}

const DEFS_PREFIX = '#/$defs/';
const COMPONENTS_PREFIX = '#/components/schemas/';

/** JSON Schema keeps shared definitions under `$defs`; OpenAPI keeps them under components. */
function pointRefsAtComponents(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pointRefsAtComponents);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === '$ref' && typeof entry === 'string' && entry.startsWith(DEFS_PREFIX)
          ? `${COMPONENTS_PREFIX}${entry.slice(DEFS_PREFIX.length)}`
          : pointRefsAtComponents(entry),
      ]),
    );
  }
  return value;
}

/**
 * Converts the zod schemas given to Nest route decorators into OpenAPI 3.1 schemas (JSON Schema
 * 2020-12), so request validation and the API document come from one source (spec §4, ADR-0013).
 * Schemas registered with `.meta({ id })` become named components. Anything that isn't a zod schema
 * is left to @nestjs/swagger.
 */
export function zodSchemaConverter(
  schema: unknown,
  options: { readonly schemaType: 'input' | 'output' },
): ConvertedSchema | undefined {
  if (!(schema instanceof z.ZodType)) {
    return undefined;
  }
  const {
    $schema: _dialect,
    $defs,
    ...root
  } = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: options.schemaType,
    unrepresentable: 'any',
  }) as JsonObject;
  const components =
    $defs !== null && typeof $defs === 'object'
      ? (pointRefsAtComponents($defs) as Record<string, unknown>)
      : undefined;
  return components === undefined
    ? { schema: pointRefsAtComponents(root) }
    : { schema: pointRefsAtComponents(root), components };
}
