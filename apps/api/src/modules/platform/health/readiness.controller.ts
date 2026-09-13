import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { PROBLEMS, ProblemException } from '../../../core/problems/problem.js';
import { Public } from '../../access/index.js';
import { ReadinessService } from './readiness.service.js';

const CheckStatusSchema = z.enum(['up', 'down']);

export const ReadinessSchema = z
  .object({
    status: z.enum(['ready', 'degraded']),
    checks: z.object({
      postgres: CheckStatusSchema,
      migrations: CheckStatusSchema,
      valkey: CheckStatusSchema,
      typesense: CheckStatusSchema,
    }),
  })
  .meta({ id: 'Readiness' });
export type Readiness = z.infer<typeof ReadinessSchema>;

/** Readiness: whether this instance can take traffic. Load balancers stop routing to it on 503. */
@ApiTags('platform')
@Controller({ path: 'ready', version: '1' })
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get()
  @Public()
  @ApiOperation({ operationId: 'getReadiness', summary: 'Readiness' })
  @ApiOkResponse({
    description: 'Ready to take traffic. "degraded" means search (Typesense) is down.',
    standardSchema: ReadinessSchema,
  })
  @ApiServiceUnavailableResponse({
    description:
      'PostgreSQL, the migrations or Valkey is down. The problem lists every check in `checks`.',
  })
  async ready(): Promise<Readiness> {
    const report = await this.readiness.check();
    if (report.status === 'unavailable') {
      throw new ProblemException({
        ...PROBLEMS.serviceUnavailable,
        detail: 'A required dependency is unavailable.',
        extensions: { checks: report.checks },
      });
    }
    return { status: report.status, checks: report.checks };
  }
}
