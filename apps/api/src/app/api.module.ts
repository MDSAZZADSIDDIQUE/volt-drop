import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { AccessModule } from '../modules/access/index.js';
import { PlatformModule } from '../modules/platform/index.js';

/** The HTTP application: configuration, access control and every API module (spec §5). */
@Module({})
export class ApiModule {
  static forRoot(env: Env, extraModules: readonly (Type | DynamicModule)[] = []): DynamicModule {
    return {
      module: ApiModule,
      imports: [ConfigModule.forRoot(env), AccessModule, PlatformModule, ...extraModules],
    };
  }
}
