import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Accept caller-supplied ids only if they are short and contain no characters that could forge log lines. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

interface RequestContextStore {
  readonly requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Per-request context available anywhere in the call chain without passing it through every
 * function (used by error responses now, and by structured logging and tracing later).
 */
export const RequestContext = {
  requestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};

export function resolveRequestId(incoming: string | undefined): string {
  return incoming !== undefined && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

/**
 * Express middleware, registered before body parsing so even malformed requests get an id.
 * Reuses a well-formed incoming X-Request-Id (for correlation across services) or creates one,
 * and echoes it on the response.
 */
export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(request.header(REQUEST_ID_HEADER));
  response.setHeader(REQUEST_ID_HEADER, requestId);
  storage.run({ requestId }, next);
}
