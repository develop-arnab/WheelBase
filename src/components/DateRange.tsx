import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, daysBetween, formatShort, monthTitle, toISO, todayISO } from '../lib/dates'
import './DateRange.css'

export type DateEnd = 'from' | 'to'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(first.getDay()).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toISO(new Date(year, month, d)))
  return cells
}

type CalendarProps = {
  from: string | null
  to: string | null
  /** which end of the trip the next click sets */
  editing: DateEnd
  onEditing: (end: DateEnd) => void
  onChange: (from: string | null, to: string | null) => void
  /** both days are set: the caller can close whatever holds the calendar */
  onDone?: () => void
  /** Days the chosen Jeep is already out, shaded in the calendar */
  isBooked?: (iso: string) => boolean
  bookedLabel?: string
  /** hide the hint row (when the caller shows its own heading) */
  bare?: boolean
}

/*
  The calendar on its own: two months, a hint that says what the next click
  does, quick picks. Used inside the date field's popover and inside the trip
  console on the first screen.
*/
export function Calendar({ from, to, editing, onEditing, onChange, onDone, isBooked, bookedLabel, bare }: CalendarProps) {
  const [hover, setHover] = useState<string | null>(null)
  const today = useMemo(todayISO, [])
  const [view, setView] = useState(() => {
    const focus = (editing === 'to' ? to ?? from : from) ?? today
    return { y: +focus.slice(0, 4), m: +focus.slice(5, 7) - 1 }
  })

  const pick = (iso: string) => {
    if (editing === 'from') {
      onChange(iso, to && iso < to ? to : null)
      onEditing('to')
      return
    }
    if (!from || iso <= from) {
      onChange(iso, null)
      return
    }
    onChange(from, iso)
    setHover(null)
    if (onDone) window.setTimeout(onDone, 260)
  }

  const shift = (n: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + n, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const previewing = editing === 'to' && from && hover && hover > from
  const rangeEnd = previewing ? hover : to
  const months = [view, (() => {
    const d = new Date(view.y, view.m + 1, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })()]
  const now = new Date()
  const atStart = view.y === now.getFullYear() && view.m === now.getMonth()
  const hint =
    editing === 'from'
      ? from ? 'Change your pick-up day' : 'Choose your pick-up day'
      : !from ? 'Choose your pick-up day' : to && !previewing ? `${daysBetween(from, to)} ${daysBetween(from, to) === 1 ? 'day' : 'days'} with the Jeep` : 'Now your return day'

  return (
    <div className="cal" data-ranging={(from && rangeEnd && rangeEnd !== from) || undefined}>
      <div className="dates__head">
        <button type="button" className="dates__nav" onClick={() => shift(-1)} disabled={atStart} aria-label="Previous month">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <p className="dates__hint" aria-live="polite">{bare ? '' : hint}</p>
        <button type="button" className="dates__nav" onClick={() => shift(1)} aria-label="Next month">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="dates__months">
        {months.map(({ y, m }) => (
          <div className="dates__month" key={`${y}-${m}`}>
            <p className="dates__title">{monthTitle(y, m)}</p>
            <div className="dates__grid" onPointerLeave={() => setHover(null)}>
              {DOW.map((d, i) => (
                <span className="dates__dow" key={i} aria-hidden="true">{d}</span>
              ))}
              {monthCells(y, m).map((iso, i) =>
                iso ? (
                  <button
                    type="button"
                    key={iso}
                    className="dates__day"
                    disabled={iso < today}
                    data-start={iso === from || undefined}
                    data-end={iso === rangeEnd || undefined}
                    data-in={(from && rangeEnd && iso > from && iso < rangeEnd) || undefined}
                    data-today={iso === today || undefined}
                    data-booked={(isBooked && iso >= today && isBooked(iso)) || undefined}
                    onPointerEnter={() => setHover(iso)}
                    onFocus={() => setHover(iso)}
                    onClick={() => pick(iso)}
                    aria-label={`${formatShort(iso)}${isBooked && isBooked(iso) ? ', booked' : ''}`}
                    aria-pressed={iso === from || iso === to}
                  >
                    {Number(iso.slice(8))}
                  </button>
                ) : (
                  <span key={`b${i}`} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      {isBooked && bookedLabel && (
        <p className="dates__legend"><i /> {bookedLabel}</p>
      )}
      <div className="dates__foot">
        <button type="button" className="dates__quick" onClick={() => { const s = from ?? addDays(today, 7); onChange(s, addDays(s, 3)); onDone?.() }}>Long weekend</button>
        <button type="button" className="dates__quick" onClick={() => { const s = from ?? addDays(today, 7); onChange(s, addDays(s, 7)); onDone?.() }}>A full week</button>
        <button type="button" className="dates__clear" onClick={() => { onChange(null, null); onEditing('from') }} disabled={!from}>Clear</button>
      </div>
    </div>
  )
}

/** Pick-up and return as two halves of one field. Each half edits its own end of the trip. */
export function DateHalves({ from, to, active, onOpen }: { from: string | null; to: string | null; active: DateEnd | null; onOpen: (end: DateEnd) => void }) {
  return (
    <>
      <button type="button" className="dates__half" aria-expanded={active === 'from'} aria-haspopup="dialog" data-active={active === 'from' || undefined} onClick={() => onOpen('from')}>
        <span className="dates__label">Pick-up</span>
        <span className="dates__value" data-empty={!from || undefined}>{from ? formatShort(from) : 'Add date'}</span>
      </button>
      <span className="dates__dash" aria-hidden="true" />
      <button type="button" className="dates__half" aria-expanded={active === 'to'} aria-haspopup="dialog" data-active={active === 'to' || undefined} onClick={() => onOpen('to')}>
        <span className="dates__label">Return</span>
        <span className="dates__value" data-empty={!to || undefined}>{to ? formatShort(to) : 'Add date'}</span>
      </button>
    </>
  )
}

type Props = {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  /** Open the calendar above the field */
  dropUp?: boolean
  /** Days the chosen Jeep is already out, shaded in the calendar */
  isBooked?: (iso: string) => boolean
  bookedLabel?: string
}

/* The date field with its own calendar popover (used in the side panel). */
export function DateRange({ from, to, onChange, dropUp, isBooked, bookedLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DateEnd>('from')
  const [flip, setFlip] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !pop.current || !root.current) {
      setFlip(false)
      return
    }
    setFlip(placePopover(root.current, pop.current))
  }, [open])

  const openAt = (end: DateEnd) => {
    const target = end === 'to' && !from ? 'from' : end
    if (open && editing === target) {
      setOpen(false)
      return
    }
    setEditing(target)
    setOpen(true)
  }

  return (
    <div className="dates" ref={root} data-open={open || undefined} data-dropup={dropUp || flip || undefined}>
      <div className="dates__field" role="group" aria-label="Trip dates">
        <DateHalves from={from} to={to} active={open ? editing : null} onOpen={openAt} />
      </div>
      {open && (
        <div className="dates__pop" ref={pop} role="dialog" aria-label="Choose pick-up and return dates">
          <Calendar
            from={from}
            to={to}
            editing={editing}
            onEditing={setEditing}
            onChange={onChange}
            onDone={() => setOpen(false)}
            isBooked={isBooked}
            bookedLabel={bookedLabel}
          />
        </div>
      )}
    </div>
  )
}

/**
  Decide where a popover goes. A floating one (position: absolute) opens
  upward when there is no room below; returns true for that. One that sits
  in the flow (in the side panel, on phones) is scrolled into view instead.
*/
export function placePopover(anchor: HTMLElement, pop: HTMLElement) {
  if (getComputedStyle(pop).position === 'absolute') {
    const r = anchor.getBoundingClientRect()
    const need = pop.offsetHeight + 16
    const header = document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 0
    const below = window.innerHeight - r.bottom
    const above = r.top - header
    return below < need && above > below
  }
  requestAnimationFrame(() => pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  return false
}
