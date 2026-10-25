import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import {
  defaultPreferences,
  generatePlan,
  validateActivities,
  preferencesSchema,
  validLocalTime,
} from '../src/shared/planner.js'
const base = {
  ...defaultPreferences(),
  weekStart: '2026-10-12',
  timezone: 'Asia/Dhaka',
  experience: false,
  reflection: false,
}
const generate = (changes = {}) => generatePlan({ ...base, ...changes }, undefined, randomUUID)
test('generator respects budget, days, unique templates, and non-overlap', () => {
  const draft = generate()
  assert.equal(
    draft.activities.reduce((s, a) => s + a.duration, 0),
    240,
  )
  assert.equal(new Set(draft.activities.map((a) => a.title)).size, draft.activities.length)
  assert.deepEqual(validateActivities(draft.preferences, draft.activities), [])
  for (const activity of draft.activities)
    assert.ok(base.weekdays.includes(DateTime.fromISO(activity.start).weekday))
})
test('secondary receives every third learning activity', () => {
  const draft = generate({ hours: 3 })
  assert.equal(draft.activities.filter((a) => a.topic === 'Economics').length, 4)
  assert.equal(draft.activities.filter((a) => a.topic === 'History').length, 2)
})
test('goals reserve budget and reflection lands on the last available day', () => {
  const draft = generate({ experience: true, reflection: true })
  assert.equal(draft.activities.filter((a) => a.kind === 'experience').length, 1)
  const reflection = draft.activities.find((a) => a.kind === 'reflect')!
  assert.equal(DateTime.fromISO(reflection.start).weekday, 7)
  const experience = draft.activities.find((a) => a.kind === 'experience')!
  assert.ok(DateTime.fromISO(experience.start).weekday >= 6)
  assert.deepEqual(validateActivities(draft.preferences, draft.activities), [])
})
test('small budget reports an experience that cannot fit', () => {
  const draft = generate({ hours: 0.25, experience: true, reflection: true })
  assert.equal(draft.activities.length, 1)
  assert.equal(draft.activities[0].kind, 'reflect')
  assert.ok(draft.messages.some((m) => m.includes('90-minute')))
})
test('late start and exhausted templates produce unused time messages', () => {
  const draft = generate({ startTime: '23:45', weekdays: [1], hours: 4 })
  assert.equal(draft.activities.length, 0)
  assert.ok(draft.messages.length)
  assert.ok(generate({ hours: 40 }).messages.some((m) => m.includes('remain unscheduled')))
})
test('invalid preferences are rejected', () => {
  assert.equal(preferencesSchema.safeParse({ ...base, weekdays: [] }).success, false)
  assert.equal(preferencesSchema.safeParse({ ...base, primary: base.secondary }).success, false)
  assert.equal(preferencesSchema.safeParse({ ...base, timezone: 'bad/zone' }).success, false)
})
test('month and year boundaries stay inside the week', () => {
  const draft = generate({ weekStart: '2026-12-28' })
  assert.deepEqual(validateActivities(draft.preferences, draft.activities), [])
  assert.ok(draft.activities.some((a) => a.start.startsWith('2027-01')))
})
test('edits reject overlaps, duplicated IDs, outside dates and nonexistent DST times', () => {
  const draft = generate()
  const first = draft.activities[0]
  assert.ok(
    validateActivities(draft.preferences, [first, { ...first, id: randomUUID() }]).includes(
      'Activities cannot overlap.',
    ),
  )
  assert.ok(
    validateActivities(draft.preferences, [first, first]).some((m) => m.includes('identifiers')),
  )
  assert.ok(
    validateActivities(draft.preferences, [{ ...first, start: '2026-10-19T18:00' }]).some((m) =>
      m.includes('selected week'),
    ),
  )
  assert.equal(validLocalTime('2026-03-08T02:30', 'America/New_York'), false)
  assert.equal(validLocalTime('2026-11-01T01:30', 'America/New_York'), false)
  const dst = generate({
    weekStart: '2026-03-02',
    timezone: 'America/New_York',
    weekdays: [7],
    startTime: '02:30',
  })
  assert.equal(dst.activities.length, 0)
})
test('deterministic scheduling and no secondary topic', () => {
  const a = generate({ secondary: null })
  const b = generate({ secondary: null })
  assert.deepEqual(
    a.activities.map(({ id, ...rest }) => rest),
    b.activities.map(({ id, ...rest }) => rest),
  )
  assert.ok(a.activities.every((v) => v.topic === base.primary))
})
