/** Flat, JSON-serializable facts about an action. Never put secrets or personal data here. */
export type AuditMetadata = Readonly<Record<string, string | number | boolean | null>>;

export interface AuditEntry {
  /** Who acted: a user id, or a technical actor such as `admin-api-key`. */
  readonly actorId: string;
  /** What happened, e.g. `PRODUCT_CREATED`. */
  readonly action: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly metadata: AuditMetadata;
}

/**
 * Port for the append-only audit trail of administrative and security-relevant actions.
 * Implementations write inside the caller's transaction, so an action and its audit record
 * are committed (or rolled back) together.
 */
export interface AuditLog {
  record(entry: AuditEntry): Promise<void>;
}
