import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';

/**
 * Platform services (spec §5): health now; policy versions, feature flags, idempotency keys and the
 * outbox arrive in M0 step 6.
 */
@Module({ controllers: [HealthController] })
export class PlatformModule {}
