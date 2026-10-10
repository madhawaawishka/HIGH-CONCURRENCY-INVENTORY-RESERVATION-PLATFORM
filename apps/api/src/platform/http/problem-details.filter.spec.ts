import type { ArgumentsHost } from '@nestjs/common';
import { Logger, NotFoundException } from '@nestjs/common';
import type { ProblemDetails } from '@stockforge/contracts';
import { DomainError } from '@stockforge/shared-kernel';
import { describe, expect, it, vi } from 'vitest';

import { ProblemDetailsFilter } from './problem-details.filter.js';
import { RequestValidationError } from './request-validation.error.js';

class OutOfStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly kind = 'conflict';

  constructor() {
    super('Only 2 units available.');
  }
}

function render(exception: unknown): { status: number; contentType: string; body: ProblemDetails } {
  const sent: { status: number; contentType: string; body: ProblemDetails } = {
    status: 0,
    contentType: '',
    body: {} as ProblemDetails,
  };
  const response = {
    status: (code: number) => ((sent.status = code), response),
    type: (value: string) => ((sent.contentType = value), response),
    json: (body: ProblemDetails) => ((sent.body = body), response),
  };
  const request = {
    method: 'POST',
    originalUrl: '/v1/reservations?debug=1',
    header: (name: string) => (name === 'X-Request-Id' ? 'req-123' : undefined),
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter().catch(exception, host);
  return sent;
}

describe('ProblemDetailsFilter', () => {
  it('renders domain errors with a status derived from their kind', () => {
    const { status, contentType, body } = render(new OutOfStockError());

    expect(status).toBe(409);
    expect(contentType).toBe('application/problem+json');
    expect(body).toEqual({
      type: '/problems/insufficient-stock',
      title: 'Insufficient stock',
      status: 409,
      detail: 'Only 2 units available.',
      code: 'INSUFFICIENT_STOCK',
      instance: '/v1/reservations',
      requestId: 'req-123',
    });
  });

  it('renders request validation errors as 400 with field-level issues', () => {
    const { status, body } = render(
      new RequestValidationError([{ path: 'price.amountMinor', message: 'Too small' }]),
    );

    expect(status).toBe(400);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.errors).toEqual([{ path: 'price.amountMinor', message: 'Too small' }]);
  });

  it('renders framework HTTP exceptions with their own status', () => {
    const { status, body } = render(new NotFoundException('Cannot GET /v1/nope'));

    expect(status).toBe(404);
    expect(body).toMatchObject({ type: 'about:blank', title: 'Not Found', code: 'NOT_FOUND' });
  });

  it('renders exposable middleware errors such as an oversized body as 413', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });

    const { status, body } = render(tooLarge);

    expect(status).toBe(413);
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('hides the details of unexpected errors and logs them', () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { status, body } = render(new Error('connection string postgres://secret@db'));

    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(logged).toHaveBeenCalledOnce();
  });
});
