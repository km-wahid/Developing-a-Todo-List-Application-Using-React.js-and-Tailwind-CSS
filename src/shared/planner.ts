import { DateTime, IANAZone } from 'luxon'
import { z } from 'zod'

export const topics = [
  'History',
  'Economics',
  'Business',
  'Luxury & culture',
  'Travel',
  'Psychology',
  'Communication',
  'Personal development',
] as const
export const topicSchema = z.enum(topics)
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => DateTime.fromISO(v).isValid, 'Choose a valid date')
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const preferencesSchema = z
  .object({
    weekStart: dateSchema.refine((v) => DateTime.fromISO(v).weekday === 1, 'Weeks begin on Monday'),
    timezone: z
      .string()
      .max(80)
      .refine((v) => IANAZone.isValidZone(v), 'Choose a valid IANA timezone'),
    primary: topicSchema,
    secondary: topicSchema.nullable(),
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .refine((v) => new Set(v).size === v.length, 'Select each day once'),
    hours: z.number().min(0.25).max(40).multipleOf(0.25),
    startTime: timeSchema,
    duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
    experience: z.boolean(),
    reflection: z.boolean(),
  })
  .refine((v) => v.primary !== v.secondary, 'Choose two different interests')
export type Preferences = z.infer<typeof preferencesSchema>
export const activitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  instructions: z.string().trim().max(2000),
  topic: topicSchema,
  kind: z.enum(['learn', 'experience', 'reflect']),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  duration: z.number().int().min(15).max(240).multipleOf(15),
})
export type Activity = z.infer<typeof activitySchema>
export type Draft = { preferences: Preferences; activities: Activity[]; messages: string[] }
export type PlanSummary = {
  id: string
  preferences: Preferences
  revision: number
  updatedAt: string
  activityCount: number
  totalMinutes: number
}
export type PlanPage = { items: PlanSummary[]; nextCursor: string | null }
export type Plan = Draft & { id: string; revision: number; updatedAt: string }
export const saveSchema = z.object({
  preferences: preferencesSchema,
  activities: z.array(activitySchema).max(160),
  revision: z.number().int().min(0),
})
export const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
export const monday = (date = DateTime.local()) => date.startOf('week').toISODate()!
export function defaultPreferences(): Preferences {
  return {
    weekStart: monday(),
    timezone: localZone(),
    primary: 'Economics',
    secondary: 'History',
    weekdays: [1, 3, 6, 7],
    hours: 4,
    startTime: '18:00',
    duration: 30,
    experience: true,
    reflection: true,
  }
}

export const templateTitles: Record<(typeof topics)[number], string[]> = {
  History: [
    'The story behind everyday money',
    'A turning point that shaped your city',
    'What ancient trade routes teach us',
    'Meet an overlooked historical figure',
    'How a local tradition began',
    'Read a primary historical source',
  ],
  Economics: [
    'How inflation touches everyday life',
    'The hidden incentives around you',
    'Understand supply and demand',
    'Where does your money go?',
    'What makes a currency valuable?',
    'Explore the economics of a local market',
  ],
  Business: [
    'Decode a business you admire',
    'What makes a useful product?',
    'Explore a founder’s first decision',
    'Map a customer journey',
    'Understand a simple business model',
    'Practice a one-minute business pitch',
  ],
  'Luxury & culture': [
    'Why are luxury watches expensive?',
    'Look closer at craftsmanship',
    'How art changes a space',
    'The story behind an iconic design',
    'Explore the meaning of luxury',
    'Notice architecture in your neighborhood',
  ],
  Travel: [
    'Discover a place close to home',
    'Design a thoughtful day trip',
    'Learn the story of a destination',
    'Explore a culture through its food',
    'Travel responsibly, one choice at a time',
    'Learn useful phrases for your next trip',
  ],
  Psychology: [
    'Notice a cognitive bias',
    'Understand how a habit forms',
    'Explore what motivates you',
    'Learn the science of attention',
    'Practice seeing another perspective',
    'Identify a pattern in your decisions',
  ],
  Communication: [
    'Practice listening with intention',
    'Tell a story in three sentences',
    'Ask a better question',
    'Make a complex idea simple',
    'Practice giving constructive feedback',
    'Observe how body language speaks',
  ],
  'Personal development': [
    'Define what a good week means',
    'Make room for a small new habit',
    'Reflect on your personal values',
    'Find your energy patterns',
    'Break a goal into a next step',
    'Explore a skill you want to build',
  ],
}
export const templates = topics.flatMap((topic) =>
  templateTitles[topic].map((title, index) => ({
    id: `${topics.indexOf(topic)}-${index}`,
    topic,
    title,
    instructions:
      'Find a reliable article, book chapter, or talk on this topic. Explore one idea in depth, then write down three takeaways and one question you still have.',
  })),
)
export type Template = (typeof templates)[number]
export function validLocalTime(value: string, zone: string) {
  const dt = DateTime.fromISO(value, { zone })
  return (
    dt.isValid &&
    dt.getPossibleOffsets().length === 1 &&
    dt.toFormat("yyyy-MM-dd'T'HH:mm") === value
  )
}
export function validateActivities(preferences: Preferences, activities: Activity[]): string[] {
  const errors: string[] = []
  const endWeek = DateTime.fromISO(preferences.weekStart, { zone: preferences.timezone }).plus({
    days: 7,
  })
  const startWeek = endWeek.minus({ days: 7 })
  const seen = new Set<string>()
  const intervals: { start: number; end: number }[] = []
  for (const activity of activities) {
    if (seen.has(activity.id)) errors.push('Activity identifiers must be unique.')
    seen.add(activity.id)
    const start = DateTime.fromISO(activity.start, { zone: preferences.timezone })
    const end = start.plus({ minutes: activity.duration })
    if (!validLocalTime(activity.start, preferences.timezone))
      errors.push('An activity has an invalid local time, possibly due to daylight saving.')
    if (end.isValid && end.getPossibleOffsets().length > 1)
      errors.push('Choose an end time outside the repeated daylight-saving hour.')
    if (start < startWeek || start >= endWeek || end > endWeek)
      errors.push('Every activity must stay within the selected week.')
    intervals.push({ start: start.toMillis(), end: end.toMillis() })
  }
  intervals.sort((a, b) => a.start - b.start)
  for (let i = 1; i < intervals.length; i++)
    if (intervals[i].start < intervals[i - 1].end) errors.push('Activities cannot overlap.')
  return [...new Set(errors)]
}
export function generatePlan(
  raw: Preferences,
  catalog: Template[] = templates,
  createId: () => string = () => crypto.randomUUID(),
): Draft {
  const preferences = preferencesSchema.parse(raw)
  const messages: string[] = []
  const activities: Activity[] = []
  const days = [...preferences.weekdays]
    .sort((a, b) => a - b)
    .map((day) => ({
      minutes: 0,
      day,
      cursor: DateTime.fromISO(
        `${DateTime.fromISO(preferences.weekStart)
          .plus({ days: day - 1 })
          .toISODate()}T${preferences.startTime}`,
        { zone: preferences.timezone },
      ),
    }))
  let remaining = preferences.hours * 60
  function schedule(item: Omit<Activity, 'id' | 'start'>) {
    if (item.duration > remaining) return false
    const day = [...days]
      .sort((a, b) =>
        item.kind === 'reflect'
          ? b.day - a.day
          : item.kind === 'experience'
            ? Number(b.day >= 6) - Number(a.day >= 6) || a.minutes - b.minutes || a.day - b.day
            : a.minutes - b.minutes || a.day - b.day,
      )
      .find((d) => {
        const start = d.cursor.toFormat("yyyy-MM-dd'T'HH:mm")
        const end = d.cursor.plus({ minutes: item.duration })
        const intended = `${DateTime.fromISO(preferences.weekStart)
          .plus({ days: d.day - 1 })
          .toISODate()}T${preferences.startTime}`
        return (
          validLocalTime(intended, preferences.timezone) &&
          validLocalTime(start, preferences.timezone) &&
          end.getPossibleOffsets().length === 1 &&
          end.toISODate() === d.cursor.toISODate()
        )
      })
    if (!day) return false
    activities.push({ ...item, id: createId(), start: day.cursor.toFormat("yyyy-MM-dd'T'HH:mm") })
    day.cursor = day.cursor.plus({ minutes: item.duration + 15 })
    day.minutes += item.duration
    remaining -= item.duration
    return true
  }
  const learnQueues = [preferences.primary, preferences.secondary].map((topic) =>
    catalog.filter((t) => t.topic === topic),
  )
  const selected: Omit<Activity, 'id' | 'start'>[] = []
  if (preferences.experience) {
    if (remaining >= 90) {
      remaining -= 90
      selected.push({
        title: 'Explore somewhere new',
        instructions:
          'Visit a nearby place connected to your interests: a museum, market, library, or neighborhood. Notice three details that surprise you.',
        topic: preferences.primary,
        kind: 'experience',
        duration: 90,
      })
    } else
      messages.push(
        'Your budget is too short for a 90-minute experience. Increase your hours to include it.',
      )
  }
  if (preferences.reflection) {
    if (remaining >= 15) {
      remaining -= 15
      selected.push({
        title: 'A moment to look back',
        instructions:
          'What stayed with you this week? Note one useful idea, one unexpected experience, and one thing to explore next.',
        topic: preferences.primary,
        kind: 'reflect',
        duration: 15,
      })
    } else messages.push('Your budget has no room for a 15-minute reflection.')
  }
  let turn = 0
  while (remaining >= 15 && learnQueues.some((q) => q.length)) {
    const preferred = preferences.secondary && turn % 3 === 2 ? 1 : 0
    const template = learnQueues[preferred].shift() ?? learnQueues[1 - preferred].shift()
    if (!template) break
    const duration = Math.min(preferences.duration, remaining)
    selected.push({
      title: template.title,
      instructions: template.instructions,
      topic: template.topic,
      kind: 'learn',
      duration,
    })
    remaining -= duration
    turn++
  }
  remaining = preferences.hours * 60
  // Place learning first, then the experience and reflection near the end of the week.
  for (const item of [
    ...selected.filter((i) => i.kind === 'learn'),
    ...selected.filter((i) => i.kind !== 'learn'),
  ]) {
    if (!schedule(item))
      messages.push(`Could not fit “${item.title}” before midnight on your available days.`)
  }
  activities.sort((a, b) => a.start.localeCompare(b.start))
  if (remaining)
    messages.push(
      `${remaining} minutes remain unscheduled. Try an earlier start time or more available days.`,
    )
  return { preferences, activities, messages }
}
