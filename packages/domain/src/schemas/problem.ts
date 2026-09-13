import { z } from 'zod';

/** Problem `type` values are stable URNs, so they don't depend on a domain name (M0 plan, step 5). */
export function problemType(code: string): string {
  return `urn:voltdrop:problem:${code}`;
}

/** RFC 9457 problem details, as returned by every VoltDrop API error (spec §6). */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  /** The request's correlation id, for support. */
  instance: z.string().optional(),
  /** Field-level validation failures. */
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
