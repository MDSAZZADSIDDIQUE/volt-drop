import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from 'pino';
import {
  PROBLEMS,
  ProblemException,
  problemForStatus,
  toProblemBody,
  type ProblemInit,
} from './problem.js';

/** Fastify's own errors (bad JSON, body too large, wrong content type) carry a 4xx statusCode. */
function clientErrorStatus(exception: unknown): number | undefined {
  if (typeof exception === 'object' && exception !== null && 'statusCode' in exception) {
    const { statusCode } = exception;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return statusCode;
    }
  }
  return undefined;
}

export function toProblem(exception: unknown): ProblemInit {
  if (exception instanceof ProblemException) {
    return exception.problem;
  }
  if (exception instanceof HttpException) {
    return problemForStatus(exception.getStatus());
  }
  const status = clientErrorStatus(exception);
  return status === undefined ? PROBLEMS.internalError : problemForStatus(status);
}

/**
 * Turns every error into an RFC 9457 problem response (spec §6). Messages and stack traces of
 * unexpected errors are logged (redacted) but never sent to the client.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const problem = toProblem(exception);
    if (problem.status >= 500) {
      this.logger.error({ err: exception, req: request }, 'Request failed');
    }
    void reply
      .status(problem.status)
      .header('content-type', 'application/problem+json')
      .send(toProblemBody(problem, request.id));
  }
}
