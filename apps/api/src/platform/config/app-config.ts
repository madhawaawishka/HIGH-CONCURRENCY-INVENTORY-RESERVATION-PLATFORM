import { z } from 'zod';

/**
 * Every environment-specific value the API needs (12-factor configuration).
 * Validated once at startup: the process refuses to start with missing or invalid settings,
 * instead of failing later on the first request that needs them.
 */
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ADMIN_API_KEY: z.string().min(32, 'ADMIN_API_KEY must be at least 32 characters long'),
});

export interface AppConfig {
  readonly environment: 'development' | 'test' | 'production';
  readonly http: { readonly port: number };
  readonly database: { readonly url: string; readonly poolMax: number };
  readonly security: { readonly adminApiKey: string };
}

/** Dependency-injection token for the typed configuration. */
export const APP_CONFIG = Symbol('APP_CONFIG');

export class InvalidConfigurationError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidConfigurationError';
  }
}

/** Pure function of its input, so it is trivial to unit-test. Secrets are never echoed back. */
export function loadAppConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = EnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw new InvalidConfigurationError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const env = result.data;
  return {
    environment: env.NODE_ENV,
    http: { port: env.PORT },
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX },
    security: { adminApiKey: env.ADMIN_API_KEY },
  };
}
