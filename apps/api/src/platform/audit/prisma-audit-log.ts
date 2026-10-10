import type { TransactionClient } from '@stockforge/database';
import type { AuditEntry, AuditLog, IdGenerator } from '@stockforge/shared-kernel';

/** Writes audit entries through the caller's transaction client. */
export class PrismaAuditLog implements AuditLog {
  constructor(
    private readonly db: TransactionClient,
    private readonly ids: IdGenerator,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        id: this.ids.next(),
        actorId: entry.actorId,
        action: entry.action,
        aggregateType: entry.aggregateType,
        aggregateId: entry.aggregateId,
        metadata: entry.metadata,
      },
    });
  }
}
