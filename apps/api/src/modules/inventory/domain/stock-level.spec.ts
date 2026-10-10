import { InvariantViolationError } from '@stockforge/shared-kernel';
import { describe, expect, it } from 'vitest';

import { InsufficientStockError } from './inventory.errors.js';
import { StockLevel, type StockLevelState } from './stock-level.js';

const productId = '0199d1e2-7b3a-7000-8000-000000000001';
const at = new Date('2026-10-10T12:00:00.000Z');

const stock = (overrides: Partial<StockLevelState> = {}): StockLevel =>
  StockLevel.restore({
    productId,
    total: 10,
    available: 6,
    reserved: 3,
    sold: 1,
    version: 4,
    updatedAt: at,
    ...overrides,
  });

describe('StockLevel', () => {
  it('starts empty and unrecorded', () => {
    const empty = StockLevel.empty(productId);

    expect(empty).toMatchObject({ total: 0, available: 0, version: 0, isRecorded: false });
    expect(empty.inStock).toBe(false);
  });

  it('restocks by increasing total and available, and bumps the version', () => {
    const next = stock().adjust(5, at);

    expect(next).toMatchObject({ total: 15, available: 11, reserved: 3, sold: 1, version: 5 });
  });

  it('writes off available units', () => {
    expect(stock().adjust(-6, at)).toMatchObject({ total: 4, available: 0, reserved: 3 });
  });

  it('never removes reserved or sold units', () => {
    expect(() => stock().adjust(-7, at)).toThrow(InsufficientStockError);
  });

  it('records the first adjustment of an empty product', () => {
    const next = StockLevel.empty(productId).adjust(100, at);

    expect(next).toMatchObject({ total: 100, available: 100, version: 1, isRecorded: true });
  });

  it('is immutable', () => {
    const original = stock();

    original.adjust(5, at);

    expect(original.available).toBe(6);
  });

  it.each([[0], [1.5], [Number.NaN]])('rejects the adjustment %s', (delta) => {
    expect(() => stock().adjust(delta, at)).toThrow(InvariantViolationError);
  });

  it.each<[string, Partial<StockLevelState>]>([
    ['unbalanced buckets', { total: 11 }],
    ['a negative bucket', { available: -1, total: 3 }],
    ['a fractional quantity', { available: 6.5, total: 10.5 }],
  ])('refuses to restore %s', (_case, overrides) => {
    expect(() => stock(overrides)).toThrow(InvariantViolationError);
  });

  it('refuses to grow beyond the storable maximum', () => {
    const full = stock({ total: 2_147_483_647, available: 2_147_483_643 });

    expect(() => full.adjust(1, at)).toThrow(InvariantViolationError);
  });
});
