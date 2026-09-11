import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdempotencyReplayWindow } from '@voltdrop/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from 'pino';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { Database } from '../../../core/database/database.js';
import { LOGGER } from '../../../core/logging/logger.js';
import { PROBLEMS, ProblemException } from '../../../core/problems/problem.js';
import { PolicyService } from '../policies/policy.service.js';
import { IdempotencyStore } from './idempotency.store.js';
import { IDEMPOTENT_KEY } from './idempotent.decorator.js';
import { parseIdempotencyKey, requestFingerprint } from './request-fingerprint.js';

/** TODO(M2): scope keys to the signed-in principal. Until sign-in exists, callers share one scope. */
const ANONYMOUS_SCOPE = 'anonymous';

/** Applies ADR-0014 to routes marked `@Idempotent()`; every other route passes straight through. */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: IdempotencyStore,
    private readonly database: Database,
    private readonly policies: PolicyService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const marked = this.reflector.get<boolean | undefined>(IDEMPOTENT_KEY, context.getHandler());
    if (context.getType() !== 'http' || marked !== true) {
      return next.handle();
    }
    return from(this.run(context, next));
  }

  private async run(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const key = parseIdempotencyKey(request.headers['idempotency-key']);
    const scope = ANONYMOUS_SCOPE;
    const fingerprint = requestFingerprint(request.method, request.url, request.body);
    const { value: replayWindowHours } = await this.policies.current(IdempotencyReplayWindow);

    const claim = await this.store.claim({ scope, key, fingerprint, replayWindowHours });
    if (claim.outcome === 'replay') {
      void reply.status(claim.status).header('Idempotent-Replayed', 'true');
      return claim.body;
    }
    if (claim.outcome === 'reused') {
      throw new ProblemException(PROBLEMS.idempotencyKeyReused);
    }
    if (claim.outcome === 'in_progress') {
      throw new ProblemException(PROBLEMS.idempotencyKeyInProgress);
    }

    const ref = { scope, key, lockToken: claim.lockToken };
    try {
      return await this.database.transaction(async (tx) => {
        const body: unknown = await lastValueFrom(next.handle(), { defaultValue: undefined });
        // Nest sets the route's status code before interceptors run, so it is final here.
        await this.store.complete(tx, { ...ref, status: reply.statusCode, body });
        return body;
      });
    } catch (error) {
      await this.store.release(ref).catch((releaseError: unknown) => {
        this.logger.warn(
          { err: releaseError },
          'Could not release an idempotency key; it unlocks when its lease expires',
        );
      });
      throw error;
    }
  }
}
