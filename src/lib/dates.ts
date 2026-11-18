/* Dates travel through the app as ISO `YYYY-MM-DD` strings, the same format
   Wheelbase uses for wb_from / wb_to. */
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const daysBetween = (from: string, to: string) => Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000)
/** Day offset from today */
export const offsetFromToday = (iso: string) => daysBetween(todayISO(), iso)

const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const long = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const formatShort = (iso: string) => short.format(fromISO(iso))
export const formatLong = (iso: string) => long.format(fromISO(iso))
export const formatRange = (from: string, to: string) => `${formatShort(from)} – ${formatShort(to)}`
export const monthTitle = (y: number, m: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1))
