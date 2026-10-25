import { forwardRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import type { CalendarOptions } from '@fullcalendar/core'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
const PlannerCalendar = forwardRef<FullCalendar, CalendarOptions>((props, ref) => (
  <FullCalendar {...props} ref={ref} plugins={[timeGridPlugin, listPlugin, interactionPlugin]} />
))
PlannerCalendar.displayName = 'PlannerCalendar'
export default PlannerCalendar
