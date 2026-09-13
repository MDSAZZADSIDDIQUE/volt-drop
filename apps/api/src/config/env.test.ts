import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { describe, expect, it } from 'vitest';
import { EnvError, EnvObject, loadEnv, LOCAL_AUTH_SECRET } from './env.js';

const envExample = parseEnv(
  readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8'),
);

/** A production configuration with every real provider and credential set. */
const production = {
  APP_ENV: 'production',
  NODE_ENV: 'production',
  API_PORT: '8080',
  API_BASE_URL: 'https://api.voltdrop.example',
  CUSTOMER_WEB_URL: 'https://voltdrop.example',
  ADMIN_URL: 'https://admin.voltdrop.example',
  MERCHANT_PORTAL_URL: 'https://merchants.voltdrop.example',
  DATABASE_URL: 'postgres://app:pw@db.internal:5432/voltdrop',
  REDIS_URL: 'redis://cache.internal:6379',
  TYPESENSE_URL: 'https://search.example.net',
  TYPESENSE_API_KEY: 'ts-key',
  S3_REGION: 'eu-west-2',
  S3_BUCKET_PUBLIC: 'voltdrop-prod-public',
  S3_BUCKET_PRIVATE: 'voltdrop-prod-private',
  AUTH_SECRET: 'a-production-secret-that-is-long-enough-123',
  DELIVERY_PROVIDER: 'uber_direct',
  UBER_DIRECT_CUSTOMER_ID: 'c',
  UBER_DIRECT_CLIENT_ID: 'i',
  UBER_DIRECT_CLIENT_SECRET: 's',
  UBER_DIRECT_WEBHOOK_SECRET: 'w',
  GEO_PROVIDER: 'google',
  GOOGLE_MAPS_SERVER_KEY: 'g',
  ADDRESS_PROVIDER: 'ideal_postcodes',
  IDEAL_POSTCODES_API_KEY: 'p',
  PRODUCT_DATA_PROVIDER: 'icecat',
  ICECAT_USERNAME: 'u',
  ICECAT_API_KEY: 'k',
  COMPANY_REGISTRY_PROVIDER: 'companies_house',
  COMPANIES_HOUSE_API_KEY: 'h',
  LLM_PROVIDER: 'anthropic',
  ANTHROPIC_API_KEY: 'sk-ant-real',
  EMAIL_PROVIDER: 'postmark',
  POSTMARK_SERVER_TOKEN: 'pm',
  EMAIL_FROM: 'VoltDrop <orders@voltdrop.example>',
  PUSH_PROVIDER: 'expo',
  TELEPHONY_PROVIDER: 'twilio',
  TWILIO_ACCOUNT_SID: 'AC',
  TWILIO_AUTH_TOKEN: 'tw',
  TWILIO_FROM_NUMBER: '+441234567890',
};

function problemsFor(source: Readonly<Record<string, string | undefined>>): readonly string[] {
  try {
    loadEnv(source);
  } catch (error) {
    if (error instanceof EnvError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe('loadEnv()', () => {
  it('boots a fresh clone with no .env file at all', () => {
    const env = loadEnv({});
    expect(env.APP_ENV).toBe('local');
    expect(env.DATABASE_URL).toBe('postgres://voltdrop:voltdrop@localhost:5432/voltdrop');
    expect(env.DELIVERY_PROVIDER).toBe('mock');
    expect(env.API_PORT).toBe(4000);
    expect(env.AUTH_TRUSTED_ORIGINS).toEqual([]);
  });

  it('accepts .env.example exactly as committed', () => {
    expect(problemsFor(envExample)).toEqual([]);
  });

  it('documents every variable in .env.example', () => {
    // The file is the only place a new variable is explained, so nothing may be added to the schema
    // without a line there (the client-app variables in the file belong to the bundlers, not here).
    const documented = new Set(Object.keys(envExample));
    expect(Object.keys(EnvObject.shape).filter((key) => !documented.has(key))).toEqual([]);
  });

  it('treats empty values as unset', () => {
    expect(
      loadEnv({ STRIPE_SECRET_KEY: '', DATABASE_READONLY_URL: '  ' }).STRIPE_SECRET_KEY,
    ).toBeUndefined();
  });

  it('splits comma-separated trusted origins', () => {
    const env = loadEnv({ AUTH_TRUSTED_ORIGINS: 'http://localhost:3000, http://localhost:5173,' });
    expect(env.AUTH_TRUSTED_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:5173']);
  });

  it('accepts a complete production configuration', () => {
    expect(problemsFor(production)).toEqual([]);
  });

  it('requires provider credentials once a real provider is chosen', () => {
    expect(problemsFor({ DELIVERY_PROVIDER: 'uber_direct' })).toEqual([
      'UBER_DIRECT_CUSTOMER_ID: Required because DELIVERY_PROVIDER is uber_direct.',
      'UBER_DIRECT_CLIENT_ID: Required because DELIVERY_PROVIDER is uber_direct.',
      'UBER_DIRECT_CLIENT_SECRET: Required because DELIVERY_PROVIDER is uber_direct.',
      'UBER_DIRECT_WEBHOOK_SECRET: Required because DELIVERY_PROVIDER is uber_direct.',
    ]);
    expect(problemsFor({ LLM_PROVIDER: 'anthropic' })).toContain(
      'ANTHROPIC_API_KEY: Required because LLM_PROVIDER is anthropic.',
    );
    expect(problemsFor({ EMAIL_PROVIDER: 'postmark' })).toContain(
      'POSTMARK_SERVER_TOKEN: Required because EMAIL_PROVIDER is postmark.',
    );
  });

  it('gives no defaults outside local', () => {
    const problems = problemsFor({ APP_ENV: 'staging' });
    expect(problems).toContain('DATABASE_URL: Invalid input: expected string, received undefined');
    expect(problems.some((problem) => problem.startsWith('AUTH_SECRET:'))).toBe(true);
  });

  it('rejects local placeholders and development stand-ins in production', () => {
    const problems = problemsFor({
      ...production,
      AUTH_SECRET: LOCAL_AUTH_SECRET,
      FIELD_ENCRYPTION_KEY: 'x'.repeat(40),
      NODE_ENV: 'development',
      DELIVERY_PROVIDER: 'mock',
      LLM_PROVIDER: 'fake',
      API_BASE_URL: 'http://api.voltdrop.example',
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        'AUTH_SECRET: The local placeholder is only allowed when APP_ENV is local.',
        'FIELD_ENCRYPTION_KEY: Only used when APP_ENV is local; cloud environments use KMS (spec §18).',
        'NODE_ENV: Must be production when APP_ENV is production.',
        'DELIVERY_PROVIDER: Must be uber_direct in production.',
        'LLM_PROVIDER: Must be anthropic in production.',
        'API_BASE_URL: Must use https in production.',
      ]),
    );
  });

  it('never includes secret values in its error', () => {
    try {
      loadEnv({
        ...production,
        STRIPE_SECRET_KEY: 'sk_live_do_not_print_me',
        DELIVERY_PROVIDER: 'mock',
      });
      expect.unreachable('loadEnv should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect(String(error)).not.toContain('sk_live_do_not_print_me');
      expect(String(error)).not.toContain('a-production-secret-that-is-long-enough-123');
    }
  });

  it('rejects values of the wrong shape', () => {
    const problems = problemsFor({
      API_PORT: '99999',
      DATABASE_URL: 'not a url',
      APP_ENV: 'local',
    });
    expect(problems.some((problem) => problem.startsWith('API_PORT:'))).toBe(true);
    expect(problems.some((problem) => problem.startsWith('DATABASE_URL:'))).toBe(true);
  });
});
