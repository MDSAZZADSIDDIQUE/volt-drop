import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

/** Injection token for the process's pg Pool. Graphile Worker shares it. */
export const PG_POOL = Symbol('PG_POOL');

export type RootDatabase = NodePgDatabase;
/** A Drizzle transaction. Code that must run inside one (outbox, jobs) takes it as a parameter. */
export type Transaction = Parameters<Parameters<RootDatabase['transaction']>[0]>[0];
/** The current transaction, or the pool when there is none. */
export type Executor = RootDatabase | Transaction;

/** The SQLSTATE of a failed query. Drizzle wraps driver errors, so the code may sit on `cause`. */
export function pgErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth += 1) {
    if ('code' in current && typeof current.code === 'string') {
      return current.code;
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return undefined;
}

export interface PoolOptions {
  readonly connectionString: string;
  /** Shown in `pg_stat_activity`, so a slow query can be traced to the api or the worker. */
  readonly applicationName: string;
  readonly max?: number;
}

export function createPool({ connectionString, applicationName, max = 10 }: PoolOptions): pg.Pool {
  return new pg.Pool({
    connectionString,
    application_name: applicationName,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/**
 * The single way to reach PostgreSQL (spec §4). `transaction` holds the open transaction in
 * AsyncLocalStorage, and a nested `transaction` call joins it instead of starting another. That is
 * how the idempotency interceptor makes a handler's writes and its stored response commit together.
 */
export class Database {
  readonly root: RootDatabase;
  private readonly current = new AsyncLocalStorage<Transaction>();

  constructor(readonly pool: pg.Pool) {
    this.root = drizzle({ client: pool });
  }

  /** The open transaction if the caller is inside one, otherwise the pool. */
  get executor(): Executor {
    return this.current.getStore() ?? this.root;
  }

  get inTransaction(): boolean {
    return this.current.getStore() !== undefined;
  }

  /** Runs `work` in a transaction, joining the caller's transaction if there is one. */
  async transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const open = this.current.getStore();
    if (open !== undefined) {
      return work(open);
    }
    return this.root.transaction((tx) => this.current.run(tx, () => work(tx)));
  }
}
