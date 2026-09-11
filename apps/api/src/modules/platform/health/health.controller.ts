import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '../../access/index.js';

export const HealthSchema = z.object({ status: z.literal('ok') }).meta({ id: 'Health' });
export type Health = z.infer<typeof HealthSchema>;

/** Liveness: the process is up and serving. It checks no dependencies, so it stays cheap. */
@ApiTags('platform')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ operationId: 'getHealth', summary: 'Liveness' })
  @ApiOkResponse({ description: 'The API process is running.', standardSchema: HealthSchema })
  health(): Health {
    return { status: 'ok' };
  }
}
