import { Redis } from 'ioredis';
import type { Logger } from 'pino';

/** Injection token for the Valkey client. Inject with `@Inject(VALKEY)`. */
export const VALKEY = Symbol('VALKEY');

/**
 * The Valkey client (spec §4: cache, rate limits, presence; never the source of truth). It connects
 * on first use and keeps reconnecting in the background. Commands fail fast while it is
 * disconnected instead of queueing, so callers can degrade rather than hang.
 */
export function createValkey(url: string, logger: Logger): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
  });

  // Log changes of state only, not every failed reconnection attempt.
  let healthy = true;
  client.on('ready', () => {
    if (!healthy) {
      logger.info('Valkey connection restored');
    }
    healthy = true;
  });
  client.on('error', (error: Error) => {
    if (healthy) {
      logger.warn({ err: error }, 'Valkey connection failed; retrying in the background');
    }
    healthy = false;
  });
  return client;
}

/** Answers whether Valkey responds to PING. Starts the first connection if nothing has yet. */
export async function pingValkey(client: Redis): Promise<boolean> {
  if (client.status === 'wait') {
    await client.connect();
  }
  await client.ping();
  return true;
}
