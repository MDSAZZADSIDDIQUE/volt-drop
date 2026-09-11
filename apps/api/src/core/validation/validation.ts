import { StandardSchemaValidationPipe } from '@nestjs/common';
import { validationProblem, type FieldProblem } from '../problems/problem.js';

/** The shape of a Standard Schema issue (https://standardschema.dev). */
interface ValidationIssue {
  readonly message: string;
  readonly path?: readonly unknown[] | undefined;
}

function segmentToString(segment: unknown): string {
  if (typeof segment === 'string' || typeof segment === 'number') {
    return String(segment);
  }
  if (typeof segment === 'symbol') {
    return segment.description ?? '';
  }
  if (typeof segment === 'object' && segment !== null && 'key' in segment) {
    return segmentToString(segment.key);
  }
  return '';
}

export function toFieldProblems(issues: readonly ValidationIssue[]): FieldProblem[] {
  return issues.map((issue) => ({
    path: (issue.path ?? []).map(segmentToString).join('.'),
    message: issue.message,
  }));
}

/**
 * Validates every @Body, @Query and @Param that declares a zod `schema` (spec §6: zod at every
 * boundary). Failures become one 400 `validation-failed` problem listing each field.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues: readonly ValidationIssue[]) =>
      validationProblem(toFieldProblems(issues)),
  });
}
