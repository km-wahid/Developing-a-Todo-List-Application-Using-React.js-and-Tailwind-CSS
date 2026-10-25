import { db, pool } from '../server/db.js'
import { templateTable } from '../server/schema.js'
import { templates } from '../src/shared/planner.js'
try {
  for (const template of templates)
    await db()
      .insert(templateTable)
      .values(template)
      .onDuplicateKeyUpdate({
        set: { title: template.title, instructions: template.instructions, topic: template.topic },
      })
  console.log(`Seeded ${templates.length} activity templates.`)
} finally {
  await pool?.end()
}
