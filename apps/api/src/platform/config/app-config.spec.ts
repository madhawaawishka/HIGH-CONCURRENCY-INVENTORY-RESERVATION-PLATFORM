import { describe, expect, it } from 'vitest';

import { InvalidConfigurationError, loadAppConfig } from './app-config.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/stockforge',
  ADMIN_API_KEY: 'k'.repeat(32),
};

describe('loadAppConfig', () => {
  it('applies defaults for optional settings', () => {
    const config = loadAppConfig(validEnvironment);

    expect(config).toEqual({
      environment: 'development',
      http: { port: 3000 },
      database: { url: validEnvironment.DATABASE_URL, poolMax: 10 },
      security: { adminApiKey: validEnvironment.ADMIN_API_KEY },
    });
  });

  it('coerces numeric settings from environment strings', () => {
    const config = loadAppConfig({ ...validEnvironment, PORT: '8080', DATABASE_POOL_MAX: '25' });

    expect(config.http.port).toBe(8080);
    expect(config.database.poolMax).toBe(25);
  });

  it('fails fast and lists every invalid setting', () => {
    const load = () =>
      loadAppConfig({ DATABASE_URL: 'mysql://localhost/db', ADMIN_API_KEY: 'short', PORT: 'x' });

    expect(load).toThrow(InvalidConfigurationError);
    expect(load).toThrow(/DATABASE_URL/);
    expect(load).toThrow(/ADMIN_API_KEY/);
    expect(load).toThrow(/PORT/);
  });

  it('never includes secret values in the error message', () => {
    const secret = 'not-long-enough-secret';

    expect(() => loadAppConfig({ ...validEnvironment, ADMIN_API_KEY: secret })).not.toThrow(
      new RegExp(secret),
    );
  });
});
