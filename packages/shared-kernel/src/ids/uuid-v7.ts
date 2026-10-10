import { randomBytes, randomInt } from 'node:crypto';

/** Source of new entity identifiers. Injected so tests can use predictable ids. */
export interface IdGenerator {
  next(): string;
}

const MAX_COUNTER = 0xfff; // 12-bit counter stored in the rand_a field.
const COUNTER_SEED_LIMIT = 0x800; // Seed below half the range to leave room for increments.

/**
 * RFC 9562 UUID version 7: a 48-bit Unix-millisecond timestamp followed by random bits.
 *
 * Ids sort by creation time, so a primary key built from them keeps B-tree inserts at the
 * right-hand edge and supports keyset pagination on the id alone. A 12-bit counter in the
 * rand_a field (RFC 9562, "method 1") keeps ids strictly increasing within one process, even
 * for many ids in the same millisecond or when the system clock moves backwards.
 */
export class UuidV7Generator implements IdGenerator {
  private lastTimestamp = -1;
  private counter = 0;

  constructor(private readonly nowMs: () => number = Date.now) {}

  next(): string {
    const now = this.nowMs();
    if (now > this.lastTimestamp) {
      this.lastTimestamp = now;
      this.counter = randomInt(0, COUNTER_SEED_LIMIT);
    } else {
      this.counter += 1;
      if (this.counter > MAX_COUNTER) {
        // Counter exhausted for this millisecond: borrow the next one to stay monotonic.
        this.lastTimestamp += 1;
        this.counter = 0;
      }
    }

    const bytes = randomBytes(16);
    bytes.writeUIntBE(this.lastTimestamp, 0, 6);
    bytes.writeUInt8(0x70 | (this.counter >> 8), 6); // version 7 + high counter bits
    bytes.writeUInt8(this.counter & 0xff, 7);
    bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8); // RFC 9562 variant (0b10)

    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
