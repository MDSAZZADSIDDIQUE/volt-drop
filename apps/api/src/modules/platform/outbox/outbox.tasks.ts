import { z } from 'zod';
import { defineTask } from '../../../core/jobs/task.js';

/** Claims undispatched events and enqueues one `outbox.handle` job per event and handler. */
export const OutboxDispatchTask = defineTask('outbox.dispatch', z.object({}));

/** Runs one handler for one event. */
export const OutboxHandleTask = defineTask(
  'outbox.handle',
  z.object({ eventId: z.uuid(), handler: z.string().min(1) }),
);

/** Every dispatch job shares this key, so a burst of events leads to a single pending dispatch. */
export const OUTBOX_DISPATCH_JOB_KEY = 'outbox.dispatch';
