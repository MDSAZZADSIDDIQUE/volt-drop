import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { CoreModule } from '../core/core.module.js';
import { WorkerRunner } from '../core/jobs/worker-runner.js';
import { PlatformModule } from '../modules/platform/index.js';
import type { AppModuleOptions } from './api.module.js';

/** The worker process (spec §4): the same modules as the API, running jobs instead of HTTP. */
@Module({})
export class WorkerModule {
  static forRoot(env: Env, { logger, extraModules = [] }: AppModuleOptions): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        ConfigModule.forRoot(env),
        CoreModule.forRoot(env, { logger, service: 'voltdrop-worker' }),
        PlatformModule,
        ...extraModules,
      ],
      providers: [WorkerRunner],
    };
  }
}
