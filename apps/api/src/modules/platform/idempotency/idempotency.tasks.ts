import { z } from 'zod';
import { defineTask } from '../../../core/jobs/task.js';

/** Deletes idempotency keys past their replay window (nightly). */
export const IdempotencyCleanupTask = defineTask('platform.idempotency_cleanup', z.object({}));
