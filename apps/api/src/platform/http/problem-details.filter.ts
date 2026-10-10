import { STATUS_CODES } from 'node:http';

import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ProblemDetails } from '@stockforge/contracts';
import { DomainError, type DomainErrorKind } from '@stockforge/shared-kernel';
import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER, RequestContext } from './request-context.js';
import { RequestValidationError } from './request-validation.error.js';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
};

type Problem = Omit<ProblemDetails, 'instance' | 'requestId'>;

/**
 * Renders every error as RFC 9457 Problem Details, the API's single error format.
 *
 * - Request validation failures -> 400 with field-level `errors`.
 * - Domain errors -> status derived from their semantic kind; the domain never knows HTTP.
 * - Framework HTTP errors (404 route, 401 guard, 413 body too large) -> their own status.
 * - Anything else -> 500 with a generic message. Details are logged, never leaked to clients.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = RequestContext.requestId() ?? request.header(REQUEST_ID_HEADER) ?? 'unknown';

    const problem = this.toProblem(exception);
    if (problem.status >= 500) {
      this.logger.error(
        `Unhandled error for ${request.method} ${request.originalUrl} (requestId=${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ProblemDetails = {
      ...problem,
      instance: request.originalUrl.split('?')[0] ?? request.originalUrl,
      requestId,
    };
    response.status(problem.status).type('application/problem+json').json(body);
  }

  private toProblem(exception: unknown): Problem {
    if (exception instanceof RequestValidationError) {
      return {
        type: '/problems/validation-failed',
        title: 'Request validation failed',
        status: HttpStatus.BAD_REQUEST,
        detail: 'One or more fields are invalid.',
        code: 'VALIDATION_FAILED',
        errors: [...exception.issues],
      };
    }

    if (exception instanceof DomainError) {
      return {
        type: `/problems/${exception.code.toLowerCase().replaceAll('_', '-')}`,
        title: humanize(exception.code),
        status: STATUS_BY_KIND[exception.kind],
        detail: exception.message,
        code: exception.code,
      };
    }

    if (exception instanceof HttpException) {
      return httpProblem(exception.getStatus(), exception.message);
    }

    if (isExposableClientError(exception)) {
      return httpProblem(exception.status, exception.message);
    }

    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred. Quote the requestId when reporting it.',
      code: 'INTERNAL_ERROR',
    };
  }
}

/** Generic HTTP problem (RFC 9457 "about:blank": the title is the status phrase). */
function httpProblem(status: number, message: string): Problem {
  const phrase = STATUS_CODES[status] ?? 'Error';
  return {
    type: 'about:blank',
    title: phrase,
    status,
    ...(status < 500 ? { detail: message } : {}),
    code: phrase.toUpperCase().replaceAll(/[^A-Z]+/g, '_'),
  };
}

/**
 * Errors from Express middleware such as body-parser follow the `http-errors` convention:
 * a 4xx `status` plus `expose: true` when the message is safe to show (e.g. 413 body too large).
 */
function isExposableClientError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}

/** PRODUCT_NOT_FOUND -> "Product not found". */
function humanize(code: string): string {
  const words = code.toLowerCase().split('_');
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
