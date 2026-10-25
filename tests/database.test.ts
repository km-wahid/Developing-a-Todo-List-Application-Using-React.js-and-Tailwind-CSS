import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { createApp } from '../server/app.js'
import { config } from '../server/config.js'
import { db, pool } from '../server/db.js'
import { users, sessions, authTokens, planTable, activityTable } from '../server/schema.js'
import { defaultPreferences, generatePlan } from '../src/shared/planner.js'
const enabled = process.env.RUN_DB_TESTS === 'true'
test(
  'database account lifecycle, ownership, revision conflicts and tokens',
  { skip: !enabled },
  async () => {
    assert.ok(
      config.DATABASE_URL && new URL(config.DATABASE_URL).pathname.endsWith('_test'),
      'RUN_DB_TESTS requires a dedicated database ending in _test.',
    )
    assert.ok(!config.SMTP_HOST, 'Database tests use development email links, not real email.')
    const app = createApp(),
      agent = request.agent(app),
      other = request.agent(app)
    const email = `test-${randomUUID()}@example.com`,
      email2 = `test-${randomUUID()}@example.com`,
      password = 'A-long-test-password-42'
    async function post(client: typeof agent, path: string, body: object, csrf?: string) {
      const r = client.post(`/api/auth/${path}`).set('Origin', config.APP_ORIGIN)
      if (csrf) r.set('X-CSRF-Token', csrf)
      return r.send(body)
    }
    const userIds: string[] = []
    try {
      for (const [client, address] of [
        [agent, email],
        [other, email2],
      ] as const) {
        const registration = await post(client, 'register', {
          name: 'Test Person',
          email: address,
          password,
          timezone: 'Asia/Dhaka',
        })
        assert.equal(registration.status, 202)
        const [u] = await db().select().from(users).where(eq(users.email, address))
        userIds.push(u.id)
        assert.equal((await post(client, 'login', { email: address, password })).status, 403)
        const token = new URL(registration.body.developmentLink).searchParams.get('verify')
        assert.equal((await post(client, 'verify', { token })).status, 200)
        assert.equal((await post(client, 'verify', { token })).status, 400)
      }
      const login = await post(agent, 'login', { email, password })
      assert.equal(login.status, 200)
      assert.ok(login.headers['set-cookie'][0].includes('HttpOnly'))
      const csrf = login.body.csrf
      assert.equal(
        (await agent.put('/api/plans').set('Origin', config.APP_ORIGIN).send({})).status,
        403,
      )
      const draft = generatePlan(defaultPreferences(), undefined, randomUUID)
      const save = (revision: number) =>
        agent
          .put('/api/plans')
          .set('Origin', config.APP_ORIGIN)
          .set('X-CSRF-Token', csrf)
          .send({ ...draft, revision })
      const first = await save(0)
      assert.equal(first.status, 200)
      const login2 = await post(other, 'login', { email: email2, password })
      assert.equal((await other.get('/api/plans')).body.items.length, 0)
      assert.equal(
        (
          await other
            .delete(`/api/plans/${first.body.id}`)
            .set('Origin', config.APP_ORIGIN)
            .set('X-CSRF-Token', login2.body.csrf)
            .send({ revision: 1 })
        ).status,
        404,
      )
      assert.equal((await save(0)).status, 409)
      const race = await Promise.all([save(1), save(1)])
      assert.deepEqual(race.map((r) => r.status).sort(), [200, 409])
      assert.equal(
        (await agent.get(`/api/plans?week=${draft.preferences.weekStart}`)).body[0].revision,
        2,
      )
      const reset = await post(agent, 'forgot-password', { email }, csrf)
      const resetToken = new URL(reset.body.developmentLink).searchParams.get('reset')
      assert.equal(
        (
          await post(
            agent,
            'reset-password',
            { token: resetToken, password: `${password}-new` },
            csrf,
          )
        ).status,
        200,
      )
      assert.equal((await agent.get('/api/plans')).status, 401)
      assert.equal(
        (await post(agent, 'reset-password', { token: resetToken, password })).status,
        400,
      )
      const next = await post(agent, 'login', { email, password: `${password}-new` })
      assert.equal(next.status, 200)
      assert.equal((await post(agent, 'logout', {}, next.body.csrf)).status, 200)
      assert.equal((await agent.get('/api/plans')).status, 401)
      const expired = 'b'.repeat(64)
      const { hashToken } = await import('../server/auth.js')
      await db()
        .insert(authTokens)
        .values({
          tokenHash: hashToken(expired),
          userId: userIds[0],
          kind: 'reset',
          expiresAt: new Date(0),
        })
      assert.equal((await post(agent, 'reset-password', { token: expired, password })).status, 400)
    } finally {
      for (const id of userIds) {
        const plans = await db().select().from(planTable).where(eq(planTable.userId, id))
        for (const p of plans)
          await db().delete(activityTable).where(eq(activityTable.planId, p.id))
        await db().delete(planTable).where(eq(planTable.userId, id))
        await db().delete(sessions).where(eq(sessions.userId, id))
        await db().delete(authTokens).where(eq(authTokens.userId, id))
        await db().delete(users).where(eq(users.id, id))
      }
      await pool?.end()
    }
  },
)
