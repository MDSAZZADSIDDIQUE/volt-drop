import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './access.decorators.js';

// Nest stores a route handler's HTTP method under this metadata key (RequestMapping in @nestjs/common).
const ROUTE_METHOD_METADATA = 'method';

/** Every route handler that declares neither @Public() nor @RequirePermissions(). */
export function findUndeclaredRoutes(
  discovery: DiscoveryService,
  scanner: MetadataScanner,
  reflector: Reflector,
): string[] {
  const undeclared: string[] = [];
  for (const wrapper of discovery.getControllers()) {
    const instance: unknown = wrapper.instance;
    if (typeof instance !== 'object' || instance === null) {
      continue;
    }
    const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
    const controller = instance.constructor as new (...args: never[]) => unknown;
    for (const name of scanner.getAllMethodNames(prototype)) {
      const handler = prototype[name];
      if (typeof handler !== 'function') {
        continue;
      }
      if (Reflect.getMetadata(ROUTE_METHOD_METADATA, handler) === undefined) {
        continue;
      }
      const targets = [handler, controller];
      const declared =
        reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true ||
        reflector.getAllAndOverride<readonly string[] | undefined>(PERMISSIONS_KEY, targets) !==
          undefined;
      if (!declared) {
        undeclared.push(`${controller.name}.${name}`);
      }
    }
  }
  return undeclared;
}

/** Refuses to start if any route forgot to declare its access (spec §6: deny by default). */
@Injectable()
export class RouteDeclarationCheck implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap(): void {
    const undeclared = findUndeclaredRoutes(this.discovery, this.scanner, this.reflector);
    if (undeclared.length > 0) {
      throw new Error(
        `Every route must declare @Public() or @RequirePermissions() (spec §6). Missing on: ${undeclared.join(', ')}`,
      );
    }
  }
}
