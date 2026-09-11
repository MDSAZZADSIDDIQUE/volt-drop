import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { isValidHandlerName, type OutboxHandler } from './events.js';

/** Where modules subscribe handlers to domain events, usually in `onModuleInit`. */
@Injectable()
export class OutboxHandlerRegistry {
  private readonly handlers = new Map<string, OutboxHandler>();

  register<TPayload extends z.ZodObject>(handler: OutboxHandler<TPayload>): void {
    if (!isValidHandlerName(handler.name)) {
      throw new Error(
        `Invalid outbox handler name "${handler.name}". Use <area>.<snake_case_name>.`,
      );
    }
    if (this.handlers.has(handler.name)) {
      throw new Error(`Outbox handler "${handler.name}" is already registered.`);
    }
    this.handlers.set(handler.name, handler);
  }

  handlersFor(type: string, version: number): OutboxHandler[] {
    return [...this.handlers.values()].filter(
      (handler) => handler.event.type === type && handler.event.version === version,
    );
  }

  get(name: string): OutboxHandler | undefined {
    return this.handlers.get(name);
  }
}
