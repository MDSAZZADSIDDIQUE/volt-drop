import type { FlagScopeType } from '../schema.js';

/** A feature flag (spec §6, ADR-0016). Every key is defined in code with its default. */
export interface FlagDefinition {
  /** `<area>.<snake_case_name>`, for example `ordering.enabled`. */
  readonly key: string;
  /** Used when no row matches the caller's scopes. */
  readonly defaultEnabled: boolean;
  readonly description: string;
}

const FLAG_KEY = /^[a-z]+(?:_[a-z]+)*\.[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function defineFlag(
  key: string,
  defaultEnabled: boolean,
  description: string,
): FlagDefinition {
  if (!FLAG_KEY.test(key)) {
    throw new Error(`Invalid flag key "${key}". Use <area>.<snake_case_name>.`);
  }
  return { key, defaultEnabled, description };
}

/** Who is asking: the scopes a flag can be set for. */
export interface FlagContext {
  readonly zoneId?: string;
  readonly merchantId?: string;
  readonly segments?: readonly string[];
}

export type FlagScope =
  | { readonly type: 'global' }
  | { readonly type: Exclude<FlagScopeType, 'global'>; readonly id: string };

export interface FlagSetting {
  readonly scopeType: FlagScopeType;
  readonly scopeId: string;
  readonly enabled: boolean;
}

/**
 * The most specific matching setting wins: user segment, then merchant, then zone, then global
 * (ADR-0016). If the caller is in several segments with different settings, disabled wins.
 */
export function resolveFlag(
  flag: FlagDefinition,
  settings: readonly FlagSetting[],
  context: FlagContext,
): boolean {
  const segments = new Set(context.segments ?? []);
  const segmentSettings = settings.filter(
    (setting) => setting.scopeType === 'user_segment' && segments.has(setting.scopeId),
  );
  if (segmentSettings.length > 0) {
    return segmentSettings.every((setting) => setting.enabled);
  }
  const find = (type: FlagScopeType, id: string | undefined): FlagSetting | undefined =>
    id === undefined
      ? undefined
      : settings.find((setting) => setting.scopeType === type && setting.scopeId === id);
  const match =
    find('merchant', context.merchantId) ??
    find('zone', context.zoneId) ??
    settings.find((setting) => setting.scopeType === 'global');
  return match?.enabled ?? flag.defaultEnabled;
}
