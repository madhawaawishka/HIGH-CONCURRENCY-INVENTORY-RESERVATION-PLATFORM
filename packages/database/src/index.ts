import type { Prisma as PrismaNamespace } from './generated/prisma/client.js';

export { createPrismaClient, type DatabaseClientOptions } from './client.js';
export { isForeignKeyViolation, isUniqueConstraintViolation } from './errors.js';
export { Prisma, PrismaClient } from './generated/prisma/client.js';
export { ProductStatus } from './generated/prisma/enums.js';

/** A Prisma client scoped to one interactive transaction. */
export type TransactionClient = PrismaNamespace.TransactionClient;
