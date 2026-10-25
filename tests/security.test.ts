import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../server/app.js'
import { config } from '../server/config.js'
import { connectionOptions, pool } from '../server/db.js'
const app = createApp()
test('health and security headers are present', async () => {
  const res = await request(app).get('/api/health')
  assert.equal(res.status, 200)
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.equal(res.headers['x-powered-by'], undefined)
  assert.ok(res.headers['content-security-policy'].includes("frame-ancestors 'none'"))
})
test('unknown API route and unauthenticated access fail clearly', async () => {
  assert.equal((await request(app).get('/api/missing')).status, 404)
  assert.equal((await request(app).get('/api/plans')).status, 401)
})
test('cross-origin writes and missing Origin are rejected', async () => {
  assert.equal(
    (await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({}))
      .status,
    403,
  )
  assert.equal((await request(app).post('/api/auth/login').send({})).status, 403)
})
test('invalid input and oversized requests fail before account writes', async () => {
  assert.equal(
    (await request(app).post('/api/auth/register').set('Origin', config.APP_ORIGIN).send({}))
      .status,
    400,
  )
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .set('Origin', config.APP_ORIGIN)
        .send({ text: 'x'.repeat(270000) })
    ).status,
    413,
  )
})
test('system databases are rejected and TLS verification is enabled', () => {
  assert.throws(() => connectionOptions('mysql://user:pass@localhost:4000/sys'))
  const options = connectionOptions('mysql://user:pass@localhost:4000/growth_planner')
  if (config.DB_TLS === 'true') {
    assert.equal((options.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized, true)
    assert.equal((options.ssl as { verifyIdentity: boolean }).verifyIdentity, true)
  }
})
test(
  'auth rate limiting returns a structured response',
  { skip: !!config.DATABASE_URL },
  async () => {
    const isolated = createApp()
    let response
    for (let i = 0; i <= config.AUTH_RATE_LIMIT; i++)
      response = await request(isolated)
        .post('/api/auth/login')
        .set('Origin', config.APP_ORIGIN)
        .send({})
    assert.equal(response!.status, 429)
    assert.ok(response!.body.error.includes('Too many'))
  },
)

after(async () => {
  await pool?.end()
})
