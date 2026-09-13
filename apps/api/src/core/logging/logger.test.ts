import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runWithContext } from '../context/request-context.js';
import { createLogger, PinoNestLogger } from './logger.js';

/** A logger that writes to memory, so tests can read exactly what would have been logged. */
function captureLogger() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  const logger = createLogger({ LOG_LEVEL: 'trace', APP_ENV: 'local' }, { destination });
  return { logger, lines };
}

describe('createLogger()', () => {
  it('writes structured JSON with service, environment and level', () => {
    const { logger, lines } = captureLogger();
    logger.info({ orderId: 'o-1' }, 'Order accepted');
    expect(lines[0]).toMatchObject({
      level: 'info',
      service: 'voltdrop-api',
      env: 'local',
      orderId: 'o-1',
      msg: 'Order accepted',
    });
    expect(typeof lines[0]?.time).toBe('string');
  });

  it('redacts personal data in objects and in messages', () => {
    const { logger, lines } = captureLogger();
    logger.info(
      { customer: { email: 'ada@example.com', firstName: 'Ada' }, note: 'Leave with Bob' },
      'Receipt sent to ada@example.com',
    );
    expect(lines[0]).toMatchObject({
      customer: { email: '[redacted]', firstName: '[redacted]' },
      note: '[redacted]',
      msg: 'Receipt sent to [email]',
    });
  });

  it('logs requests as method and path only', () => {
    const { logger, lines } = captureLogger();
    logger.info({
      req: {
        id: 'req-12345678',
        method: 'GET',
        url: '/v1/orders?email=ada@example.com',
        headers: { authorization: 'Bearer x' },
        socket: { remoteAddress: '203.0.113.9' },
      },
      res: { statusCode: 200, headers: { 'set-cookie': 'sid=1' } },
    });
    expect(lines[0]?.req).toEqual({ id: 'req-12345678', method: 'GET', url: '/v1/orders' });
    expect(lines[0]?.res).toEqual({ statusCode: 200 });
    expect(JSON.stringify(lines[0])).not.toContain('203.0.113.9');
  });

  it('serialises errors and masks personal data inside them', () => {
    const { logger, lines } = captureLogger();
    logger.error({ err: new Error('duplicate key (email)=(ada@example.com)') }, 'Insert failed');
    expect(lines[0]?.err).toMatchObject({
      type: 'Error',
      message: 'duplicate key (email)=([email])',
    });
  });

  it('adds the correlation id of the current request', () => {
    const { logger, lines } = captureLogger();
    runWithContext({ correlationId: 'req-abcdefgh' }, () => {
      logger.info('inside');
    });
    logger.info('outside');
    expect(lines[0]).toMatchObject({ correlationId: 'req-abcdefgh', msg: 'inside' });
    expect(lines[1]).not.toHaveProperty('correlationId');
  });
});

describe('PinoNestLogger', () => {
  it('maps Nest log calls onto pino with their context', () => {
    const { logger, lines } = captureLogger();
    const nest = new PinoNestLogger(logger);
    nest.log('Mapped {/v1/health, GET} route', 'RouterExplorer');
    nest.warn({ detail: 'object message' }, 'Bootstrap');
    nest.debug('debug line');
    nest.verbose('verbose line', 'Scanner');
    nest.fatal('fatal line');
    nest.error('Failed to start', 'Error: boom\n    at x', 'NestApplication');
    nest.error(new Error('Boom for ada@example.com'));
    expect(lines.map((line) => [line.level, line.msg, line.context])).toEqual([
      ['info', 'Mapped {/v1/health, GET} route', 'RouterExplorer'],
      ['warn', '{"detail":"object message"}', 'Bootstrap'],
      ['debug', 'debug line', undefined],
      ['trace', 'verbose line', 'Scanner'],
      ['fatal', 'fatal line', undefined],
      ['error', 'Failed to start', 'NestApplication'],
      ['error', 'Boom for [email]', undefined],
    ]);
    expect(lines[5]?.stack).toBe('Error: boom\n    at x');
    expect(lines[6]?.err).toMatchObject({ type: 'Error', message: 'Boom for [email]' });
  });
});
