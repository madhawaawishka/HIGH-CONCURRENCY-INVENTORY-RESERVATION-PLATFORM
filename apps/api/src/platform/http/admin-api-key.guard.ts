import { createHash, timingSafeEqual } from 'node:crypto';

import {
  applyDecorators,
  Inject,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ProblemDetails } from '@stockforge/contracts';
import type { Request } from 'express';

import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export const ADMIN_API_KEY_HEADER = 'X-Admin-Api-Key';
export const ADMIN_SECURITY_SCHEME = 'admin-api-key';

/** Actor recorded in audit logs for admin-key requests (replaced by the JWT subject in Week 2). */
export const ADMIN_API_KEY_ACTOR = 'admin-api-key';

/**
 * Interim protection for admin endpoints until JWT authentication and roles land in Week 2.
 * Keys are compared in constant time (on fixed-length digests) to avoid timing side channels.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly expectedDigest: Buffer;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.expectedDigest = sha256(config.security.adminApiKey);
  }

  canActivate(context: ExecutionContext): boolean {
    const provided = context.switchToHttp().getRequest<Request>().header(ADMIN_API_KEY_HEADER);
    if (provided === undefined || !timingSafeEqual(sha256(provided), this.expectedDigest)) {
      throw new UnauthorizedException(`A valid ${ADMIN_API_KEY_HEADER} header is required.`);
    }
    return true;
  }
}

/** Marks a controller or route as admin-only, for both the runtime and the OpenAPI document. */
export function AdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminApiKeyGuard),
    ApiSecurity(ADMIN_SECURITY_SCHEME),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid admin API key.',
      standardSchema: ProblemDetails,
    }),
  );
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
