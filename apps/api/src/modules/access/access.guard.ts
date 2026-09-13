import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PROBLEMS, ProblemException } from '../../core/problems/problem.js';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './access.decorators.js';

/** Runs before every route. Public routes pass; everything else is denied until M2 adds sign-in. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true) {
      return true;
    }
    const permissions = this.reflector.getAllAndOverride<readonly string[] | undefined>(
      PERMISSIONS_KEY,
      targets,
    );
    if (permissions === undefined) {
      // The start-up check makes this unreachable; it stays as a second line of defence.
      throw new ProblemException({
        ...PROBLEMS.forbidden,
        detail: "This route doesn't declare who may use it.",
      });
    }
    // TODO(M2): authenticate the caller and check `permissions` against their roles and scope.
    throw new ProblemException(PROBLEMS.unauthenticated);
  }
}
