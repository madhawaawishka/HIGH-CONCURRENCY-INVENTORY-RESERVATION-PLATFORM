import { Prisma } from './generated/prisma/client.js';

/*
 * Repositories translate these into domain errors, so callers never depend on Prisma error codes.
 */

/** A write violated a UNIQUE constraint (Prisma P2002). */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** A write referenced a row that does not exist (Prisma P2003). */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
