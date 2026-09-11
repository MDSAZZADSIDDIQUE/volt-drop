import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { zodSchemaConverter } from './zod-schema-converter.js';

export const OPENAPI_VERSION = '3.1.0';

/** Builds the OpenAPI 3.1 document from the controllers and their zod schemas (spec §4). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('VoltDrop API')
    .setDescription(
      'REST API for the VoltDrop apps. Errors are RFC 9457 problem details (application/problem+json).',
    )
    .setVersion('0.1.0')
    .setOpenAPIVersion(OPENAPI_VERSION)
    .build();
  return SwaggerModule.createDocument(app, config, {
    standardSchemaConverter: zodSchemaConverter,
  });
}

/** Swagger UI at /docs and the document at /docs/openapi.json. Never registered in production. */
export function registerApiReference(app: INestApplication, document: OpenAPIObject): void {
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
    raw: ['json'],
    customSiteTitle: 'VoltDrop API reference',
  });
}
