import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FeatureFlagService } from './flags/feature-flag.service.js';
import { HealthController } from './health/health.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { ReadinessService } from './health/readiness.service.js';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor.js';
import { IdempotencyStore } from './idempotency/idempotency.store.js';
import { OutboxHandlerRegistry } from './outbox/outbox-handler.registry.js';
import { OutboxDispatcher } from './outbox/outbox.dispatcher.js';
import { OutboxService } from './outbox/outbox.service.js';
import { PlatformTasks } from './platform.tasks.js';
import { PolicyService } from './policies/policy.service.js';

/**
 * Platform services (spec §5): health and readiness, policy versions, feature flags, idempotency
 * keys and the transactional outbox.
 */
@Module({
  controllers: [HealthController, ReadinessController],
  providers: [
    PolicyService,
    FeatureFlagService,
    OutboxService,
    OutboxDispatcher,
    OutboxHandlerRegistry,
    IdempotencyStore,
    ReadinessService,
    PlatformTasks,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [PolicyService, FeatureFlagService, OutboxService, OutboxHandlerRegistry],
})
export class PlatformModule {}
