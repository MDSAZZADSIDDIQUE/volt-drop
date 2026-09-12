import { z } from 'zod';

/**
 * Environment configuration, validated at start-up (spec §6, §18). The API and worker refuse to boot
 * on invalid config. With APP_ENV=local every value has a local-only default, so a fresh clone runs
 * without a .env file or any external account. Outside local there are no defaults for connection
 * strings, secrets or providers.
 */

// Local-only placeholders. They are rejected in staging and production.
export const LOCAL_AUTH_SECRET = 'local-only-auth-secret-never-use-outside-dev';
export const LOCAL_FIELD_ENCRYPTION_KEY = 'local-only-field-encryption-key-never-use-outside-dev';

export const LOCAL_DEFAULTS: Readonly<Record<string, string>> = {
  APP_ENV: 'local',
  NODE_ENV: 'development',
  API_PORT: '4000',
  LOG_LEVEL: 'info',
  API_BASE_URL: 'http://localhost:4000',
  CUSTOMER_WEB_URL: 'http://localhost:3000',
  ADMIN_URL: 'http://localhost:5173',
  MERCHANT_PORTAL_URL: 'http://localhost:5174',
  DATABASE_URL: 'postgres://voltdrop:voltdrop@localhost:5432/voltdrop',
  REDIS_URL: 'redis://localhost:6379',
  TYPESENSE_URL: 'http://localhost:8108',
  TYPESENSE_API_KEY: 'local-dev-typesense-key',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'eu-west-2',
  S3_BUCKET_PUBLIC: 'voltdrop-public',
  S3_BUCKET_PRIVATE: 'voltdrop-private',
  S3_ACCESS_KEY_ID: 'voltdrop-local',
  S3_SECRET_ACCESS_KEY: 'voltdrop-local-secret',
  FIELD_ENCRYPTION_KEY: LOCAL_FIELD_ENCRYPTION_KEY,
  AUTH_SECRET: LOCAL_AUTH_SECRET,
  DELIVERY_PROVIDER: 'mock',
  GEO_PROVIDER: 'mock',
  ADDRESS_PROVIDER: 'fixture',
  PRODUCT_DATA_PROVIDER: 'fixture',
  COMPANY_REGISTRY_PROVIDER: 'fixture',
  LLM_PROVIDER: 'fake',
  EMAIL_PROVIDER: 'smtp',
  SMTP_URL: 'smtp://localhost:1025',
  EMAIL_FROM: 'VoltDrop <orders@voltdrop.example>',
  PUSH_PROVIDER: 'log',
  TELEPHONY_PROVIDER: 'log',
};

const secret = z.string().min(1);
const url = z.url();
const commaSeparated = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== ''),
);

/** Exported so a test can check that .env.example documents every variable. */
export const EnvObject = z.object({
  APP_ENV: z.enum(['local', 'staging', 'production']),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_PORT: z.coerce.number().int().min(1).max(65_535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  API_BASE_URL: url,
  CUSTOMER_WEB_URL: url,
  ADMIN_URL: url,
  MERCHANT_PORTAL_URL: url,

  DATABASE_URL: url,
  DATABASE_READONLY_URL: url.optional(),
  REDIS_URL: url,
  TYPESENSE_URL: url,
  TYPESENSE_API_KEY: secret,
  // Omitted in AWS: the SDK uses the default endpoint and the task's IAM role.
  S3_ENDPOINT: url.optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET_PUBLIC: z.string().min(3),
  S3_BUCKET_PRIVATE: z.string().min(3),
  S3_ACCESS_KEY_ID: secret.optional(),
  S3_SECRET_ACCESS_KEY: secret.optional(),
  FIELD_ENCRYPTION_KEY: z.string().min(32).optional(),

  AUTH_SECRET: z.string().min(32),
  AUTH_TRUSTED_ORIGINS: commaSeparated.default([]),
  ADMIN_OIDC_ISSUER: url.optional(),
  ADMIN_OIDC_CLIENT_ID: secret.optional(),
  ADMIN_OIDC_CLIENT_SECRET: secret.optional(),

  STRIPE_SECRET_KEY: secret.optional(),
  STRIPE_PUBLISHABLE_KEY: secret.optional(),
  STRIPE_WEBHOOK_SECRET: secret.optional(),

  DELIVERY_PROVIDER: z.enum(['mock', 'uber_direct']),
  UBER_DIRECT_CUSTOMER_ID: secret.optional(),
  UBER_DIRECT_CLIENT_ID: secret.optional(),
  UBER_DIRECT_CLIENT_SECRET: secret.optional(),
  UBER_DIRECT_WEBHOOK_SECRET: secret.optional(),

  GEO_PROVIDER: z.enum(['mock', 'google']),
  GOOGLE_MAPS_SERVER_KEY: secret.optional(),
  GOOGLE_MAPS_WEB_KEY: secret.optional(),
  GOOGLE_MAPS_ANDROID_KEY: secret.optional(),
  GOOGLE_MAPS_IOS_KEY: secret.optional(),
  ADDRESS_PROVIDER: z.enum(['fixture', 'ideal_postcodes']),
  IDEAL_POSTCODES_API_KEY: secret.optional(),

  PRODUCT_DATA_PROVIDER: z.enum(['fixture', 'icecat']),
  ICECAT_USERNAME: secret.optional(),
  ICECAT_API_KEY: secret.optional(),
  COMPANY_REGISTRY_PROVIDER: z.enum(['fixture', 'companies_house']),
  COMPANIES_HOUSE_API_KEY: secret.optional(),

  LLM_PROVIDER: z.enum(['fake', 'anthropic']),
  ANTHROPIC_API_KEY: secret.optional(),
  ASSISTANT_MODEL: z.string().min(1).default('claude-haiku-4-5-20251001'),
  CATALOGUE_MODEL: z.string().min(1).default('claude-sonnet-5'),

  EMAIL_PROVIDER: z.enum(['smtp', 'postmark']),
  SMTP_URL: url.optional(),
  POSTMARK_SERVER_TOKEN: secret.optional(),
  EMAIL_FROM: z.string().min(3),
  PUSH_PROVIDER: z.enum(['log', 'expo']),
  EXPO_ACCESS_TOKEN: secret.optional(),
  TELEPHONY_PROVIDER: z.enum(['log', 'twilio']),
  TWILIO_ACCOUNT_SID: secret.optional(),
  TWILIO_AUTH_TOKEN: secret.optional(),
  TWILIO_FROM_NUMBER: secret.optional(),

  SENTRY_DSN_API: url.optional(),
  SENTRY_DSN_WEB: url.optional(),
  SENTRY_DSN_MOBILE: url.optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: url.optional(),
  POSTHOG_KEY: secret.optional(),
  POSTHOG_HOST: url.optional(),
});

type EnvShape = z.infer<typeof EnvObject>;

/** Variables that become required when a provider is switched to its real implementation. */
const REQUIRED_WHEN: readonly {
  readonly applies: (env: EnvShape) => boolean;
  readonly because: string;
  readonly keys: readonly (keyof EnvShape)[];
}[] = [
  {
    applies: (env) => env.DELIVERY_PROVIDER === 'uber_direct',
    because: 'DELIVERY_PROVIDER is uber_direct',
    keys: [
      'UBER_DIRECT_CUSTOMER_ID',
      'UBER_DIRECT_CLIENT_ID',
      'UBER_DIRECT_CLIENT_SECRET',
      'UBER_DIRECT_WEBHOOK_SECRET',
    ],
  },
  {
    applies: (env) => env.GEO_PROVIDER === 'google',
    because: 'GEO_PROVIDER is google',
    keys: ['GOOGLE_MAPS_SERVER_KEY'],
  },
  {
    applies: (env) => env.ADDRESS_PROVIDER === 'ideal_postcodes',
    because: 'ADDRESS_PROVIDER is ideal_postcodes',
    keys: ['IDEAL_POSTCODES_API_KEY'],
  },
  {
    applies: (env) => env.PRODUCT_DATA_PROVIDER === 'icecat',
    because: 'PRODUCT_DATA_PROVIDER is icecat',
    keys: ['ICECAT_USERNAME', 'ICECAT_API_KEY'],
  },
  {
    applies: (env) => env.COMPANY_REGISTRY_PROVIDER === 'companies_house',
    because: 'COMPANY_REGISTRY_PROVIDER is companies_house',
    keys: ['COMPANIES_HOUSE_API_KEY'],
  },
  {
    applies: (env) => env.LLM_PROVIDER === 'anthropic',
    because: 'LLM_PROVIDER is anthropic',
    keys: ['ANTHROPIC_API_KEY'],
  },
  {
    applies: (env) => env.EMAIL_PROVIDER === 'smtp',
    because: 'EMAIL_PROVIDER is smtp',
    keys: ['SMTP_URL'],
  },
  {
    applies: (env) => env.EMAIL_PROVIDER === 'postmark',
    because: 'EMAIL_PROVIDER is postmark',
    keys: ['POSTMARK_SERVER_TOKEN'],
  },
  {
    applies: (env) => env.TELEPHONY_PROVIDER === 'twilio',
    because: 'TELEPHONY_PROVIDER is twilio',
    keys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
  },
];

/** Development stand-ins that must never run in production (spec §10). */
const PRODUCTION_PROVIDERS: readonly {
  readonly key: keyof EnvShape;
  readonly required: string;
}[] = [
  { key: 'DELIVERY_PROVIDER', required: 'uber_direct' },
  { key: 'GEO_PROVIDER', required: 'google' },
  { key: 'ADDRESS_PROVIDER', required: 'ideal_postcodes' },
  { key: 'PRODUCT_DATA_PROVIDER', required: 'icecat' },
  { key: 'COMPANY_REGISTRY_PROVIDER', required: 'companies_house' },
  { key: 'LLM_PROVIDER', required: 'anthropic' },
  { key: 'EMAIL_PROVIDER', required: 'postmark' },
  { key: 'PUSH_PROVIDER', required: 'expo' },
  { key: 'TELEPHONY_PROVIDER', required: 'twilio' },
];

const PUBLIC_URL_KEYS = [
  'API_BASE_URL',
  'CUSTOMER_WEB_URL',
  'ADMIN_URL',
  'MERCHANT_PORTAL_URL',
] as const;

export const EnvSchema = EnvObject.superRefine((env, ctx) => {
  for (const rule of REQUIRED_WHEN) {
    if (!rule.applies(env)) {
      continue;
    }
    for (const key of rule.keys) {
      if (env[key] === undefined) {
        ctx.addIssue({ code: 'custom', path: [key], message: `Required because ${rule.because}.` });
      }
    }
  }

  if (env.APP_ENV === 'local') {
    return;
  }
  if (env.AUTH_SECRET === LOCAL_AUTH_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['AUTH_SECRET'],
      message: 'The local placeholder is only allowed when APP_ENV is local.',
    });
  }
  if (env.FIELD_ENCRYPTION_KEY !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['FIELD_ENCRYPTION_KEY'],
      message: 'Only used when APP_ENV is local; cloud environments use KMS (spec §18).',
    });
  }

  if (env.APP_ENV !== 'production') {
    return;
  }
  if (env.NODE_ENV !== 'production') {
    ctx.addIssue({
      code: 'custom',
      path: ['NODE_ENV'],
      message: 'Must be production when APP_ENV is production.',
    });
  }
  for (const { key, required } of PRODUCTION_PROVIDERS) {
    if (env[key] !== required) {
      ctx.addIssue({ code: 'custom', path: [key], message: `Must be ${required} in production.` });
    }
  }
  for (const key of PUBLIC_URL_KEYS) {
    if (!env[key].startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Must use https in production.' });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;

/** Thrown when configuration is invalid. Lists variable names and rules, never their values. */
export class EnvError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Configuration is invalid:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'EnvError';
    this.problems = problems;
  }
}

/** Empty values in .env files (`KEY=`) mean "not set". */
function withoutEmptyValues(
  source: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== '') {
      result[key] = value;
    }
  }
  return result;
}

export function loadEnv(source: Readonly<Record<string, string | undefined>> = process.env): Env {
  const provided = withoutEmptyValues(source);
  const input =
    (provided.APP_ENV ?? 'local') === 'local' ? { ...LOCAL_DEFAULTS, ...provided } : provided;
  const result = EnvSchema.safeParse(input);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}
