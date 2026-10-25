import 'dotenv/config'
import { z } from 'zod'
const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    APP_ORIGIN: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().optional(),
    DB_TLS: z.enum(['true', 'false']).default('true'),
    DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(5),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('Bloom <hello@example.com>'),
    AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
    DB_CA_FILE: z.string().optional(),
    DB_SOCKET_PATH: z.string().optional(),
  })
  .parse(process.env)
export const config = {
  ...env,
  APP_ORIGIN: new URL(env.APP_ORIGIN).origin,
  production: env.NODE_ENV === 'production',
}
if (
  config.production &&
  (!config.DATABASE_URL ||
    config.DB_TLS !== 'true' ||
    !config.SMTP_HOST ||
    !config.APP_ORIGIN.startsWith('https://') ||
    !!config.DB_SOCKET_PATH)
) {
  throw new Error(
    'Production requires DATABASE_URL, verified DB_TLS, SMTP_HOST, and an HTTPS APP_ORIGIN.',
  )
}
