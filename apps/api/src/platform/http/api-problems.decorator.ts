import { STATUS_CODES } from 'node:http';

import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ProblemDetails } from '@stockforge/contracts';

/** Documents the error statuses a route can return, all in the Problem Details format. */
export function ApiProblems(...statuses: readonly number[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: `${STATUS_CODES[status] ?? 'Error'} (Problem Details)`,
        standardSchema: ProblemDetails,
      }),
    ),
  );
}
