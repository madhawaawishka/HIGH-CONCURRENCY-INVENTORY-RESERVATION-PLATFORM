import { z } from 'zod';

/** One field-level validation failure. */
export const ValidationIssue = z.object({
  path: z.string().meta({
    description: 'Dot-separated path to the invalid field.',
    example: 'price.amountMinor',
  }),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssue>;

/**
 * RFC 9457 Problem Details, the single error format of the API.
 * Extended with a stable machine-readable `code` and the `requestId` for support.
 */
export const ProblemDetails = z
  .object({
    type: z.string().meta({
      description: 'URI reference identifying the problem type.',
      example: '/problems/insufficient-stock',
    }),
    title: z.string().meta({ example: 'Insufficient stock' }),
    status: z.int().meta({ example: 409 }),
    detail: z.string().optional(),
    instance: z.string().meta({ description: 'Request path.', example: '/v1/reservations' }),
    code: z.string().meta({ description: 'Stable error code.', example: 'INSUFFICIENT_STOCK' }),
    requestId: z.string().meta({ description: 'Value of the X-Request-Id header.' }),
    errors: z.array(ValidationIssue).optional(),
  })
  .meta({ id: 'ProblemDetails' });
export type ProblemDetails = z.infer<typeof ProblemDetails>;
