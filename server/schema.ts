import {
  mysqlTable,
  varchar,
  text,
  int,
  datetime,
  json,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/mysql-core'
import type { Preferences } from '../src/shared/planner.js'
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 80 }).notNull(),
    verifiedAt: datetime('verified_at'),
    createdAt: datetime('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
)
export const sessions = mysqlTable(
  'sessions',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    csrf: varchar('csrf', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at').notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expiry_idx').on(t.expiresAt)],
)
export const authTokens = mysqlTable(
  'auth_tokens',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    kind: varchar('kind', { length: 16 }).notNull(),
    expiresAt: datetime('expires_at').notNull(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId)],
)
export const planTable = mysqlTable(
  'plans',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    weekStart: varchar('week_start', { length: 10 }).notNull(),
    preferences: json('preferences').$type<Preferences>().notNull(),
    revision: int('revision').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (t) => [uniqueIndex('plans_user_week_unique').on(t.userId, t.weekStart)],
)
export const activityTable = mysqlTable(
  'activities',
  {
    id: varchar('id', { length: 36 }).notNull(),
    planId: varchar('plan_id', { length: 36 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    instructions: text('instructions').notNull(),
    topic: varchar('topic', { length: 40 }).notNull(),
    kind: varchar('kind', { length: 16 }).notNull(),
    start: varchar('local_start', { length: 16 }).notNull(),
    duration: int('duration').notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.id] }), index('activities_plan_idx').on(t.planId)],
)
export const templateTable = mysqlTable('templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  topic: varchar('topic', { length: 40 }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  instructions: text('instructions').notNull(),
})
