import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import { and, eq, lt, desc, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, HttpError, pool } from './db.js'
import { planTable, activityTable, templateTable } from './schema.js'
import {
  generatePlan,
  preferencesSchema,
  saveSchema,
  validateActivities,
  templates,
  activitySchema,
  type Plan,
  type Template,
} from '../src/shared/planner.js'
export async function catalog(): Promise<Template[]> {
  return pool ? ((await db().select().from(templateTable)) as Template[]) : templates
}
export async function generate(req: Request, res: Response) {
  const preferences = preferencesSchema.parse(req.body)
  const items = await catalog()
  if (!items.length)
    throw new HttpError(503, 'Activity templates are missing. Run the database seed command.')
  res.json(generatePlan(preferences, items, randomUUID))
}
export async function listPlans(req: Request, res: Response) {
  const query = z
    .object({
      week: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      before: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .parse(req.query)
  if (query.week) {
    const plans = await db().transaction(async (tx) => {
      const [plan] = await tx
        .select()
        .from(planTable)
        .where(and(eq(planTable.userId, req.account!.id), eq(planTable.weekStart, query.week!)))
        .limit(1)
      if (!plan) return []
      const activities = await tx
        .select()
        .from(activityTable)
        .where(eq(activityTable.planId, plan.id))
      return [
        {
          id: plan.id,
          preferences: plan.preferences,
          revision: plan.revision,
          updatedAt: plan.updatedAt.toISOString(),
          messages: [],
          activities: activities.map((a) => activitySchema.parse(a)),
        } satisfies Plan,
      ]
    })
    res.json(plans)
    return
  }
  const rows = await db()
    .select()
    .from(planTable)
    .where(
      and(
        eq(planTable.userId, req.account!.id),
        query.before ? lt(planTable.weekStart, query.before) : undefined,
      ),
    )
    .orderBy(desc(planTable.weekStart))
    .limit(13)
  const visible = rows.slice(0, 12)
  const totals = visible.length
    ? await db()
        .select({
          planId: activityTable.planId,
          count: sql<number>`COUNT(*)`,
          minutes: sql<number>`SUM(${activityTable.duration})`,
        })
        .from(activityTable)
        .where(
          inArray(
            activityTable.planId,
            visible.map((p) => p.id),
          ),
        )
        .groupBy(activityTable.planId)
    : []
  res.json({
    items: visible.map((p) => ({
      id: p.id,
      preferences: p.preferences,
      revision: p.revision,
      updatedAt: p.updatedAt.toISOString(),
      activityCount: Number(totals.find((t) => t.planId === p.id)?.count ?? 0),
      totalMinutes: Number(totals.find((t) => t.planId === p.id)?.minutes ?? 0),
    })),
    nextCursor: rows.length > 12 ? visible.at(-1)!.weekStart : null,
  })
}
export async function savePlan(req: Request, res: Response) {
  const { preferences, activities, revision } = saveSchema.parse(req.body)
  const errors = validateActivities(preferences, activities)
  if (errors.length) throw new HttpError(400, errors.join(' '))
  const userId = req.account!.id
  const updatedAt = new Date()
  let id = ''
  try {
    await db().transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(planTable)
        .where(and(eq(planTable.userId, userId), eq(planTable.weekStart, preferences.weekStart)))
        .limit(1)
        .for('update')
      if ((existing?.revision ?? 0) !== revision)
        throw new HttpError(
          409,
          'This week changed on another device. Reload the saved week before saving again.',
        )
      id = existing?.id ?? randomUUID()
      if (existing) {
        await tx
          .update(planTable)
          .set({ preferences, revision: revision + 1, updatedAt })
          .where(eq(planTable.id, id))
        await tx.delete(activityTable).where(eq(activityTable.planId, id))
      } else
        await tx.insert(planTable).values({
          id,
          userId,
          weekStart: preferences.weekStart,
          preferences,
          revision: 1,
          updatedAt,
        })
      if (activities.length)
        await tx.insert(activityTable).values(activities.map((a) => ({ ...a, planId: id })))
    })
  } catch (error) {
    const code =
      (error as { cause?: { code?: string }; code?: string }).cause?.code ??
      (error as { code?: string }).code
    if (['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(code ?? ''))
      throw new HttpError(
        409,
        'This week changed while saving. Reload the saved week and try again.',
      )
    throw error
  }
  res.json({
    id,
    preferences,
    activities,
    revision: revision + 1,
    updatedAt: updatedAt.toISOString(),
    messages: [],
  } satisfies Plan)
}
export async function deletePlan(req: Request, res: Response) {
  const id = z.string().uuid().parse(req.params.id)
  const { revision } = z.object({ revision: z.number().int().min(1) }).parse(req.body)
  await db().transaction(async (tx) => {
    const [plan] = await tx
      .select()
      .from(planTable)
      .where(and(eq(planTable.id, id), eq(planTable.userId, req.account!.id)))
      .for('update')
    if (!plan) throw new HttpError(404, 'Plan not found.')
    if (plan.revision !== revision)
      throw new HttpError(409, 'This week changed on another device. Reload it before deleting.')
    await tx.delete(activityTable).where(eq(activityTable.planId, id))
    await tx.delete(planTable).where(eq(planTable.id, id))
  })
  res.status(204).end()
}
