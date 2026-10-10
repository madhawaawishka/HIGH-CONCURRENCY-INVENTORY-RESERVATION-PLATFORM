import type { StandardSchemaValidationPipeOptions } from '@nestjs/common';
import type { ValidationIssue } from '@stockforge/contracts';

type SchemaIssue = Parameters<
  NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>
>[0][number];

/** The request does not match its schema (body, query or path). Rendered as HTTP 400. */
export class RequestValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super('The request is invalid.');
    this.name = 'RequestValidationError';
  }

  static fromSchemaIssues(issues: readonly SchemaIssue[]): RequestValidationError {
    return new RequestValidationError(
      issues.map((issue) => ({
        path: (issue.path ?? [])
          .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
          .join('.'),
        message: issue.message,
      })),
    );
  }
}
