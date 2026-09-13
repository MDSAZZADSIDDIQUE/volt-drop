import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const IDEMPOTENT_KEY = 'voltdrop:platform:idempotent';

/**
 * Requires an `Idempotency-Key` header and replays the first successful response for a repeated
 * key (spec §6, ADR-0014). The handler runs inside one database transaction: its
 * `Database.transaction` calls join it, so its writes commit together with the stored response.
 */
export function Idempotent(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    SetMetadata(IDEMPOTENT_KEY, true),
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description:
        'A unique key for this request, such as a UUID. Retrying with the same key returns the first response instead of repeating the action.',
      schema: { type: 'string', minLength: 1, maxLength: 255 },
    }),
  );
}
