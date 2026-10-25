import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { z } from 'zod'
import pino from 'pino'
import { config } from './config.js'
import { pool, HttpError } from './db.js'
import { DatabaseRateStore } from './rate-store.js'
import {
  loadSession,
  protectWrites,
  requireAuth,
  publicUser,
  register,
  login,
  logout,
  requestLink,
  consumeToken,
} from './auth.js'
import { catalog, generate, listPlans, savePlan, deletePlan } from './plans.js'
export const logger = pino({ level: config.NODE_ENV === 'test' ? 'silent' : 'info' })
export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.TRUST_PROXY_HOPS)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'style-src': ["'self'", "'unsafe-inline'"],
          'script-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-ancestors': ["'none'"],
        },
      },
      strictTransportSecurity: config.production ? undefined : false,
    }),
  )
  app.use((req, res, next) => {
    const requestId = randomUUID()
    res.setHeader('X-Request-ID', requestId)
    const start = Date.now()
    res.on('finish', () =>
      logger.info(
        {
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          elapsedMs: Date.now() - start,
        },
        'request',
      ),
    )
    next()
  })
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.get('/api/ready', async (_req, res) => {
    try {
      if (!pool) throw new Error()
      await pool.query('SELECT 1')
      res.json({ status: 'ready' })
    } catch {
      res.status(503).json({ status: 'unavailable' })
    }
  })
  app.use(
    '/api',
    express.json({ limit: '256kb' }),
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store')
      next()
    },
    loadSession,
    protectWrites,
  )
  app.get('/api/auth/session', (req, res) =>
    res.json({
      user: req.account ? publicUser(req.account) : null,
      csrf: req.session?.csrf ?? null,
    }),
  )
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.AUTH_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(pool ? { store: new DatabaseRateStore() } : {}),
    message: { error: 'Too many account requests. Try again in 15 minutes.' },
  })
  app.post('/api/auth/register', authLimit, register)
  app.post('/api/auth/login', authLimit, login)
  app.post('/api/auth/logout', logout)
  app.post('/api/auth/request-verification', authLimit, (req, res) =>
    requestLink(req, res, 'verify'),
  )
  app.post('/api/auth/forgot-password', authLimit, (req, res) => requestLink(req, res, 'reset'))
  app.post('/api/auth/verify', authLimit, (req, res) => consumeToken(req, res, 'verify'))
  app.post('/api/auth/reset-password', authLimit, (req, res) => consumeToken(req, res, 'reset'))
  app.get('/api/templates', async (_req, res) => res.json(await catalog()))
  app.use('/api/plans', requireAuth)
  app.post('/api/plans/generate', generate)
  app.get('/api/plans', listPlans)
  app.put('/api/plans', savePlan)
  app.delete('/api/plans/:id', deletePlan)
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')))
  if (config.production) {
    app.use(express.static(resolve('dist'), { index: false, maxAge: '1h' }))
    app.get('/{*path}', (_req, res) =>
      res.setHeader('Cache-Control', 'no-cache').sendFile(resolve('dist/index.html')),
    )
  }
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const validation = error instanceof z.ZodError
      const status =
        error instanceof HttpError
          ? error.status
          : validation
            ? 400
            : (error as { status?: number }).status === 413
              ? 413
              : (error as { type?: string }).type === 'entity.parse.failed'
                ? 400
                : 500
      if (status >= 500)
        logger.error(
          {
            errorName: error instanceof Error ? error.name : 'Error',
            code:
              (error as { cause?: { code?: string }; code?: string }).cause?.code ??
              (error as { code?: string }).code,
          },
          'request failed',
        )
      res.status(status).json({
        error:
          error instanceof HttpError
            ? error.message
            : validation
              ? error.issues.map((i) => i.message).join(' ')
              : status === 413
                ? 'Request is too large.'
                : status === 400
                  ? 'Invalid JSON request.'
                  : 'Something went wrong. Please try again.',
      })
    },
  )
  return app
}
