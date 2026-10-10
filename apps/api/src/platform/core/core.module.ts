import { Global, Module } from '@nestjs/common';
import { SystemClock, UuidV7Generator } from '@stockforge/shared-kernel';

/** Injection tokens for framework-free ports from the shared kernel. */
export const CLOCK = Symbol('CLOCK');
export const ID_GENERATOR = Symbol('ID_GENERATOR');

@Global()
@Module({
  providers: [
    { provide: CLOCK, useValue: new SystemClock() },
    // One generator per process keeps ids strictly increasing within the process.
    { provide: ID_GENERATOR, useValue: new UuidV7Generator() },
  ],
  exports: [CLOCK, ID_GENERATOR],
})
export class CoreModule {}
