import { Module } from '@nestjs/common';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { AccessGuard } from './access.guard.js';
import { RouteDeclarationCheck } from './route-declarations.js';

/**
 * Deny-by-default groundwork (spec §6, §12). M0 enforces that every route declares its access;
 * M2 adds sign-in, roles, resource scoping and the permission matrix.
 */
@Module({
  imports: [DiscoveryModule],
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }, RouteDeclarationCheck],
})
export class AccessModule {}
