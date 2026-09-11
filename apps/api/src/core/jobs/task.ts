import type { z } from 'zod';

/**
 * A background job type (spec §4, ADR-0015). The payload is checked against its schema when the job
 * is enqueued and again when it runs.
 */
export interface TaskDefinition<TPayload extends z.ZodObject = z.ZodObject> {
  /** `<area>.<snake_case_name>`. Stored with every job, so never renamed while jobs may exist. */
  readonly name: string;
  readonly payload: TPayload;
}

const TASK_NAME = /^[a-z]+(?:_[a-z]+)*(?:\.[a-z]+(?:_[a-z]+)*)+$/;

export function defineTask<TPayload extends z.ZodObject>(
  name: string,
  payload: TPayload,
): TaskDefinition<TPayload> {
  if (!TASK_NAME.test(name)) {
    throw new Error(`Invalid task name "${name}". Use <area>.<snake_case_name>.`);
  }
  return { name, payload };
}

/** Reserved payload member for metadata that travels with a job. */
export const JOB_META_KEY = '_meta';

export interface JobMeta {
  /** The correlation id of the request (or job) that enqueued this one. */
  readonly correlationId?: string;
}
