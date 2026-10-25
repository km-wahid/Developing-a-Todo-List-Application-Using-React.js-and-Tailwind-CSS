import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { config } from './config.js'
import * as schema from './schema.js'
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export function connectionOptions(url: string, useDatabase = true): mysql.PoolOptions {
  const parsed = new URL(url)
  if (parsed.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql:// protocol.')
  const database = decodeURIComponent(parsed.pathname.slice(1))
  if (
    !database ||
    ['sys', 'mysql', 'information_schema', 'performance_schema'].includes(database.toLowerCase())
  )
    throw new Error(
      'Use a dedicated application database, such as growth_planner, instead of a system database.',
    )
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    ...(useDatabase ? { database } : {}),
    connectionLimit: config.DB_POOL_SIZE,
    timezone: 'Z',
    connectTimeout: 10000,
    ssl:
      config.DB_TLS === 'true'
        ? {
            rejectUnauthorized: true,
            verifyIdentity: true,
            minVersion: 'TLSv1.2',
            ...(config.DB_CA_FILE ? { ca: readFileSync(config.DB_CA_FILE) } : {}),
          }
        : undefined,
    multipleStatements: false,
    queueLimit: 50,
    enableKeepAlive: true,
    ...(!config.production && config.DB_SOCKET_PATH ? { socketPath: config.DB_SOCKET_PATH } : {}),
  }
}
export const pool = config.DATABASE_URL
  ? mysql.createPool(connectionOptions(config.DATABASE_URL))
  : null
const database = pool ? drizzle(pool, { schema, mode: 'default' }) : null
export function db() {
  if (!database)
    throw new HttpError(
      503,
      'Database is not configured yet. Set DATABASE_URL to enable accounts and saved plans.',
    )
  return database
}
