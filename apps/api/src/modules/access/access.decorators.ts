import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'voltdrop:access:public';
export const PERMISSIONS_KEY = 'voltdrop:access:permissions';

/** Anyone may call this route. Every other route must declare permissions (spec §6: deny by default). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * The caller needs all of these permissions. Checked from M2; until then these routes answer 401,
 * because nobody can sign in yet.
 */
export const RequirePermissions = (
  ...permissions: readonly string[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
