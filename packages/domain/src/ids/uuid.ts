import { v7, validate, version } from 'uuid';
import { z } from 'zod';

declare const idTag: unique symbol;

/**
 * A UUIDv7 primary key, generated in the application (spec §6). `Tag` names the entity, so an order
 * id can't be passed where a store id is expected.
 */
export type Id<Tag extends string> = string & { readonly [idTag]: Tag };

export function isUuidV7(value: unknown): value is string {
  return typeof value === 'string' && validate(value) && version(value) === 7;
}

export function newId<Tag extends string>(): Id<Tag> {
  return v7() as Id<Tag>;
}

export function parseId<Tag extends string>(value: unknown): Id<Tag> {
  if (!isUuidV7(value)) {
    throw new TypeError('Expected a UUIDv7 identifier.');
  }
  return value as Id<Tag>;
}

export const UuidV7Schema = z
  .string()
  .refine(isUuidV7, { message: 'Expected a UUIDv7 identifier.' });
