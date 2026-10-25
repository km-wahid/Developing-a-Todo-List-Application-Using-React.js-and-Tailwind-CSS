import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { config } from '../server/config.js'
import { connectionOptions, pool } from '../server/db.js'
if (!config.DATABASE_URL) throw new Error('Set DATABASE_URL before running migrations.')
const options = connectionOptions(config.DATABASE_URL)
const connection = await mysql.createConnection(connectionOptions(config.DATABASE_URL, false))
try {
  const name = options.database!
  if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error('Database name must contain only letters, numbers, and underscores.')
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await connection.changeUser({ database: name })
  await connection.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL)',
  )
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    'SELECT id FROM schema_migrations WHERE id = ?',
    ['001_initial'],
  )
  if (!rows.length) {
    const migration = await readFile(
      new URL('../migrations/001_initial.sql', import.meta.url),
      'utf8',
    )
    for (const statement of migration
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean))
      await connection.query(statement)
    await connection.query(
      'INSERT INTO schema_migrations (id, applied_at) VALUES (?, UTC_TIMESTAMP())',
      ['001_initial'],
    )
    console.log('Applied 001_initial.')
  } else console.log('Database is up to date.')
} finally {
  await connection.end()
  await pool?.end()
}
