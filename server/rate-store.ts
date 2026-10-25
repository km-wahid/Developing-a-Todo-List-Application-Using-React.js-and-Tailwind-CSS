import { createHash } from 'node:crypto'
import type { Store, Options, IncrementResponse } from 'express-rate-limit'
import { pool } from './db.js'
import type { RowDataPacket } from 'mysql2'
export class DatabaseRateStore implements Store {
  localKeys = false
  private windowMs = 900000
  init(options: Options) {
    this.windowMs = options.windowMs
  }
  private bucket(key: string) {
    const bucket = Math.floor(Date.now() / this.windowMs)
    return {
      key: createHash('sha256').update(`${key}:${bucket}`).digest('hex'),
      resetTime: new Date((bucket + 1) * this.windowMs),
    }
  }
  async increment(key: string): Promise<IncrementResponse> {
    const bucket = this.bucket(key)
    await pool!.execute(
      'INSERT INTO rate_limits (bucket_key, hits, expires_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE hits = hits + 1',
      [bucket.key, bucket.resetTime],
    )
    const [rows] = await pool!.execute<RowDataPacket[]>(
      'SELECT hits FROM rate_limits WHERE bucket_key = ?',
      [bucket.key],
    )
    return { totalHits: rows[0].hits, resetTime: bucket.resetTime }
  }
  async decrement(key: string) {
    await pool!.execute(
      'UPDATE rate_limits SET hits = GREATEST(0, hits - 1) WHERE bucket_key = ?',
      [this.bucket(key).key],
    )
  }
  async resetKey(key: string) {
    await pool!.execute('DELETE FROM rate_limits WHERE bucket_key = ?', [this.bucket(key).key])
  }
}
