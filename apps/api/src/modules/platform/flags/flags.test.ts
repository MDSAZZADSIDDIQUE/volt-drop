import { describe, expect, it } from 'vitest';
import { defineFlag, resolveFlag, type FlagSetting } from './flags.js';

const ordering = defineFlag('ordering.enabled', true, 'Customers can place orders.');

const setting = (
  scopeType: FlagSetting['scopeType'],
  scopeId: string,
  enabled: boolean,
): FlagSetting => ({ scopeType, scopeId, enabled });

describe('defineFlag', () => {
  it.each(['ordering', 'Ordering.enabled', 'ordering.isEnabled', 'ordering.enabled_'])(
    'rejects the malformed key %s',
    (key) => {
      expect(() => defineFlag(key, true, 'x')).toThrow(/Invalid flag key/);
    },
  );
});

describe('resolveFlag', () => {
  it('uses the default when nothing is set', () => {
    expect(resolveFlag(ordering, [], {})).toBe(true);
    expect(resolveFlag(defineFlag('assistant.enabled', false, 'x'), [], {})).toBe(false);
  });

  it('uses the global setting over the default', () => {
    expect(resolveFlag(ordering, [setting('global', '', false)], {})).toBe(false);
  });

  it('prefers zone over global, merchant over zone, and segment over merchant', () => {
    const settings = [
      setting('global', '', false),
      setting('zone', 'zone-1', true),
      setting('merchant', 'merchant-1', false),
      setting('user_segment', 'trade', true),
    ];
    expect(resolveFlag(ordering, settings, {})).toBe(false);
    expect(resolveFlag(ordering, settings, { zoneId: 'zone-1' })).toBe(true);
    expect(resolveFlag(ordering, settings, { zoneId: 'zone-1', merchantId: 'merchant-1' })).toBe(
      false,
    );
    expect(
      resolveFlag(ordering, settings, {
        zoneId: 'zone-1',
        merchantId: 'merchant-1',
        segments: ['trade'],
      }),
    ).toBe(true);
  });

  it('ignores settings for other zones, merchants and segments', () => {
    const settings = [
      setting('zone', 'zone-2', false),
      setting('merchant', 'merchant-2', false),
      setting('user_segment', 'staff', false),
    ];
    expect(
      resolveFlag(ordering, settings, {
        zoneId: 'zone-1',
        merchantId: 'merchant-1',
        segments: ['trade'],
      }),
    ).toBe(true);
  });

  it('lets disabled win when the caller is in segments that disagree', () => {
    const settings = [
      setting('user_segment', 'trade', true),
      setting('user_segment', 'beta', false),
    ];
    expect(resolveFlag(ordering, settings, { segments: ['trade', 'beta'] })).toBe(false);
    expect(resolveFlag(ordering, settings, { segments: ['trade'] })).toBe(true);
  });
});
