/** Injection token for the clock. Services that compare times take it, so tests can control time. */
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
