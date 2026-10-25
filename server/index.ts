import { createApp, logger } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'
const server = createApp().listen(config.PORT, '0.0.0.0', () =>
  logger.info({ port: config.PORT }, 'Bloom is listening'),
)
const cleanup = setInterval(
  async () => {
    if (!pool) return
    try {
      await pool.execute('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()')
      await pool.execute('DELETE FROM auth_tokens WHERE expires_at < UTC_TIMESTAMP()')
      await pool.execute('DELETE FROM rate_limits WHERE expires_at < UTC_TIMESTAMP()')
    } catch {
      logger.warn('Expired record cleanup failed.')
    }
  },
  60 * 60 * 1000,
)
cleanup.unref()
function shutdown() {
  clearInterval(cleanup)
  server.close(async () => {
    await pool?.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
