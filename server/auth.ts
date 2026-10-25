import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { and, eq, gt } from 'drizzle-orm'
import argon2 from 'argon2'
import { z } from 'zod'
import { db, HttpError } from './db.js'
import { users, sessions, authTokens } from './schema.js'
import { config } from './config.js'
import { sendLink } from './mail.js'
import { localZone } from '../src/shared/planner.js'
import { IANAZone } from 'luxon'
export const hashToken = (v: string) => createHash('sha256').update(v).digest('hex')
const randomToken = () => randomBytes(32).toString('hex')
const cookieName = config.production ? '__Host-bloom_session' : 'bloom_session'
const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: 'lax' as const,
  path: '/',
}
export type PublicUser = { id: string; name: string; email: string; timezone: string }
export function publicUser(user: typeof users.$inferSelect): PublicUser {
  return { id: user.id, name: user.name, email: user.email, timezone: user.timezone }
}
declare global {
  namespace Express {
    interface Request {
      account?: typeof users.$inferSelect
      session?: typeof sessions.$inferSelect
    }
  }
}
export function sessionToken(req: Request) {
  return req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
}
export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = sessionToken(req)
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const [row] = await db()
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
        .limit(1)
      if (row?.user.verifiedAt) {
        req.account = row.user
        req.session = row.session
      }
    }
    next()
  } catch (error) {
    next(error)
  }
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.account) return next(new HttpError(401, 'Sign in to save and manage your plans.'))
  next()
}
export function protectWrites(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.headers.origin !== config.APP_ORIGIN || req.headers['sec-fetch-site'] === 'cross-site')
    return next(new HttpError(403, 'Request origin is not allowed.'))
  if (req.session) {
    const value = req.headers['x-csrf-token']
    if (
      typeof value !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value) ||
      value.length !== req.session.csrf.length ||
      !timingSafeEqual(Buffer.from(value), Buffer.from(req.session.csrf))
    )
      return next(new HttpError(403, 'Session validation failed. Refresh and try again.'))
  }
  next()
}
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128)
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/)
async function issueToken(userId: string, kind: 'verify' | 'reset') {
  const token = randomToken()
  await db()
    .insert(authTokens)
    .values({
      tokenHash: hashToken(token),
      userId,
      kind,
      expiresAt: new Date(Date.now() + (kind === 'verify' ? 86400000 : 1800000)),
    })
  return token
}
export async function register(req: Request, res: Response) {
  const input = z
    .object({
      name: z.string().trim().min(1).max(80),
      email: emailSchema,
      password: passwordSchema,
      timezone: z
        .string()
        .max(80)
        .refine((v) => IANAZone.isValidZone(v))
        .default(localZone()),
    })
    .parse(req.body)
  const [existing] = await db().select().from(users).where(eq(users.email, input.email)).limit(1)
  let developmentLink: string | undefined
  if (!existing) {
    const id = randomUUID()
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })
    try {
      await db().insert(users).values({
        id,
        name: input.name,
        email: input.email,
        timezone: input.timezone,
        passwordHash,
        createdAt: new Date(),
      })
      developmentLink = await sendLink(input.email, 'verify', await issueToken(id, 'verify'))
    } catch (error) {
      if (
        (error as { cause?: { code?: string }; code?: string }).cause?.code !== 'ER_DUP_ENTRY' &&
        (error as { code?: string }).code !== 'ER_DUP_ENTRY'
      )
        throw error
    }
  }
  res.status(202).json({
    message:
      'If this address is eligible, a verification email has been sent. You can also request a new verification link.',
    ...(!config.production && developmentLink ? { developmentLink } : {}),
  })
}
const dummyHash = argon2.hash(randomToken(), {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
})
export async function login(req: Request, res: Response) {
  const input = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .parse(req.body)
  const [user] = await db().select().from(users).where(eq(users.email, input.email)).limit(1)
  const valid = await argon2.verify(user?.passwordHash ?? (await dummyHash), input.password)
  if (!user || !valid) throw new HttpError(401, 'Email or password is incorrect.')
  if (!user.verifiedAt)
    throw new HttpError(
      403,
      'Verify your email before signing in. Request a new link below if needed.',
    )
  const token = randomToken(),
    csrf = randomToken()
  if (req.session) await db().delete(sessions).where(eq(sessions.tokenHash, req.session.tokenHash))
  await db()
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      userId: user.id,
      csrf,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    })
  res
    .cookie(cookieName, token, { ...cookieOptions, maxAge: 7 * 86400000 })
    .json({ user: publicUser(user), csrf })
}
export async function logout(req: Request, res: Response) {
  if (req.session) await db().delete(sessions).where(eq(sessions.tokenHash, req.session.tokenHash))
  res.clearCookie(cookieName, cookieOptions).json({ message: 'Signed out.' })
}
export async function requestLink(req: Request, res: Response, kind: 'verify' | 'reset') {
  const { email } = z.object({ email: emailSchema }).parse(req.body)
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1)
  let developmentLink: string | undefined
  if (user && (kind === 'reset' || !user.verifiedAt))
    developmentLink = await sendLink(email, kind, await issueToken(user.id, kind))
  res.status(202).json({
    message: 'If this address is eligible, an email with the next steps has been sent.',
    ...(!config.production && developmentLink ? { developmentLink } : {}),
  })
}
export async function consumeToken(req: Request, res: Response, kind: 'verify' | 'reset') {
  const { token } = z.object({ token: tokenSchema }).parse(req.body)
  const passwordHash =
    kind === 'reset'
      ? await argon2.hash(passwordSchema.parse(req.body.password), {
          type: argon2.argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        })
      : undefined
  await db().transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(token)),
          eq(authTokens.kind, kind),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
    if (!record) throw new HttpError(400, 'This link is invalid or expired. Request a new one.')
    // A single account lock serializes verification/reset tokens for the same user.
    await tx.select().from(users).where(eq(users.id, record.userId)).for('update')
    const [fresh] = await tx
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.tokenHash, record.tokenHash), gt(authTokens.expiresAt, new Date())))
      .for('update')
    if (!fresh) throw new HttpError(400, 'This link is invalid or expired. Request a new one.')
    await tx
      .update(users)
      .set(kind === 'verify' ? { verifiedAt: new Date() } : { passwordHash })
      .where(eq(users.id, record.userId))
    await tx
      .delete(authTokens)
      .where(and(eq(authTokens.userId, record.userId), eq(authTokens.kind, kind)))
    if (kind === 'reset') await tx.delete(sessions).where(eq(sessions.userId, record.userId))
  })
  res.json({
    message:
      kind === 'verify'
        ? 'Email verified. You can now sign in.'
        : 'Password updated. Sign in with your new password.',
  })
}
