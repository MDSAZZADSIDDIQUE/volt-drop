import { createTranslator } from 'use-intl/core';
import { describe, expect, it } from 'vitest';
import { LOCALE, messages, TIME_ZONE } from './index.js';

function leafKeys(tree: Readonly<Record<string, unknown>>, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : leafKeys(value as Readonly<Record<string, unknown>>, `${prefix}${key}.`),
  );
}

describe('the en-GB catalogue', () => {
  it('formats every message through use-intl without errors', () => {
    const errors: unknown[] = [];
    const translate = createTranslator({
      locale: LOCALE,
      messages,
      timeZone: TIME_ZONE,
      onError: (error) => {
        errors.push(error);
      },
    }) as unknown as (key: string) => string;

    const keys = leafKeys(messages);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(translate(key), key).not.toBe('');
    }
    expect(errors).toEqual([]);
  });

  it('uses UK conventions', () => {
    expect(LOCALE).toBe('en-GB');
    expect(TIME_ZONE).toBe('Europe/London');
  });
});
