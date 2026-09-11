import { Module, type DynamicModule, type Type } from '@nestjs/common';
import type { Logger } from 'pino';
import { ConfigModule } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { CoreModule } from '../core/core.module.js';
import { AccessModule } from '../modules/access/index.js';
import { PlatformModule } from '../modules/platform/index.js';

export interface AppModuleOptions {
  readonly logger: Logger;
  /** Extra modules to mount, for tests. */
  readonly extraModules?: readonly (Type | DynamicModule)[];
}

/** The HTTP application: configuration, infrastructure, access control and every API module (spec §5). */
@Module({})
export class ApiModule {
  static forRoot(env: Env, { logger, extraModules = [] }: AppModuleOptions): DynamicModule {
    return {
      module: ApiModule,
      imports: [
        ConfigModule.forRoot(env),
        CoreModule.forRoot(env, { logger, service: 'voltdrop-api' }),
        AccessModule,
        PlatformModule,
        ...extraModules,
      ],
    };
  }
}
