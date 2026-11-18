import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { stageAccessories, extraById, type ExtraId } from '../data/extras'
import { fleetAt, paints, type PaintId, type Roof, type Vehicle } from '../data/fleet'
import { baseById, spotById, type BaseId } from '../data/places'
import { daysBetween, offsetFromToday } from './dates'
import { planLegs, type Leg } from './route'

/*
  The whole trip lives here: where, when, which Jeep, what kit, which stops.
  Every step reads and writes this one state, so nothing disagrees. Derived
  facts (which Jeep that is, whether it is free, the route, the price) are
  computed from it, never stored.
*/

export type Step = 0 | 1 | 2 | 3 | 4

export type TripState = {
  step: Step
  base: BaseId
  from: string | null
  to: string | null
  paint: PaintId
  roof: Roof
  roofOpen: boolean
  extras: ExtraId[]
  stops: string[]
  /** last thing the planner did that the visitor should hear about */
  notice: string | null
}

type Action =
  | { type: 'step'; step: Step }
  | { type: 'base'; base: BaseId }
  | { type: 'dates'; from: string | null; to: string | null }
  | { type: 'paint'; paint: PaintId }
  | { type: 'roof'; roof: Roof }
  | { type: 'vehicle'; vehicle: Vehicle }
  | { type: 'roofOpen'; open: boolean }
  | { type: 'extra'; id: ExtraId }
  | { type: 'stop'; id: string }
  | { type: 'stops'; stops: string[] }
  | { type: 'restore'; state: Partial<TripState> }

export type Availability = { state: 'no-dates' } | { state: 'free' } | { state: 'booked'; until: number }

export function availability(v: Vehicle, from: string | null, to: string | null): Availability {
  if (!from || !to) return { state: 'no-dates' }
  const a = offsetFromToday(from)
  const b = offsetFromToday(to) - 1
  const clash = v.booked.find(([s, e]) => s <= b && e >= a)
  return clash ? { state: 'booked', until: clash[1] } : { state: 'free' }
}

/** The Jeep at this base that best matches a paint and roof, preferring ones that are free. */
function pick(base: BaseId, paint: PaintId | null, roof: Roof | null, from: string | null, to: string | null) {
  const here = fleetAt(base)
  const free = (v: Vehicle) => availability(v, from, to).state !== 'booked'
  const score = (v: Vehicle) => (v.paint === paint ? 4 : 0) + (v.roof === roof ? 2 : 0) + (free(v) ? 1 : 0)
  return [...here].sort((x, y) => score(y) - score(x))[0]
}

function reducer(s: TripState, a: Action): TripState {
  switch (a.type) {
    case 'step':
      return { ...s, step: a.step, notice: null }
    case 'base': {
      if (a.base === s.base) return s
      const v = pick(a.base, s.paint, s.roof, s.from, s.to)
      const island = baseById(a.base).island
      const kept = s.stops.filter((id) => spotById(id).island === island)
      const dropped = s.stops.length - kept.length
      return {
        ...s,
        base: a.base,
        paint: v.paint,
        roof: v.roof,
        stops: kept,
        notice: dropped ? `Cleared ${dropped} ${dropped === 1 ? 'stop' : 'stops'} from your old route.` : null,
      }
    }
    case 'dates':
      return { ...s, from: a.from, to: a.to }
    case 'paint': {
      const here = fleetAt(s.base).filter((v) => v.paint === a.paint)
      if (!here.length) return s
      const v = here.find((x) => x.roof === s.roof) ?? here[0]
      return { ...s, paint: v.paint, roof: v.roof }
    }
    case 'roof': {
      const v = pick(s.base, s.paint, a.roof, s.from, s.to)
      if (v.roof !== a.roof) return s
      return { ...s, paint: v.paint, roof: v.roof, roofOpen: a.roof === 'hardtop' ? false : s.roofOpen }
    }
    case 'vehicle':
      return { ...s, base: a.vehicle.base, paint: a.vehicle.paint, roof: a.vehicle.roof }
    case 'roofOpen':
      return { ...s, roofOpen: a.open }
    case 'extra': {
      const on = s.extras.includes(a.id)
      if (on) return { ...s, extras: s.extras.filter((x) => x !== a.id) }
      const slot = extraById(a.id).slot
      const rest = slot ? s.extras.filter((x) => extraById(x).slot !== slot) : s.extras
      return { ...s, extras: [...rest, a.id] }
    }
    case 'stop':
      return { ...s, stops: s.stops.includes(a.id) ? s.stops.filter((x) => x !== a.id) : [...s.stops, a.id], notice: null }
    case 'stops':
      return { ...s, stops: a.stops }
    case 'restore':
      return { ...s, ...a.state, notice: null }
  }
}

export const initialTrip: TripState = {
  step: 0,
  base: 'nantucket',
  from: null,
  to: null,
  paint: 'red',
  roof: 'sky',
  roofOpen: false,
  extras: [],
  stops: [],
  notice: null,
}

/* ---------- derived ---------- */

export function derive(s: TripState) {
  const base = baseById(s.base)
  const here = fleetAt(s.base)
  const vehicle = here.find((v) => v.paint === s.paint && v.roof === s.roof) ?? here[0]
  const avail = availability(vehicle, s.from, s.to)
  const days = s.from && s.to ? Math.max(1, daysBetween(s.from, s.to)) : 0
  const jeepCost = days * vehicle.dayRate
  const kitPerDay = s.extras.reduce((n, id) => n + extraById(id).perDay, 0)
  const kitCost = days * kitPerDay
  const legs: Leg[] = planLegs(base.node, s.stops.map((id) => spotById(id).node))
  const miles = legs.reduce((n, l) => n + l.miles, 0)
  const minutes = legs.reduce((n, l) => n + l.minutes, 0)
  const ferries = legs.flatMap((l) => l.ferries)
  const sand = legs.some((l) => l.sand)
  const exploringHours = minutes / 60 + s.stops.length * 1.75
  const daysNeeded = s.stops.length ? Math.max(1, Math.ceil(exploringHours / 7)) : 0
  const alternatives = here.filter((v) => v.id !== vehicle.id && availability(v, s.from, s.to).state === 'free')
  return {
    base,
    here,
    vehicle,
    paint: paints[vehicle.paint],
    avail,
    alternatives,
    days,
    jeepCost,
    kitPerDay,
    kitCost,
    total: jeepCost + kitCost,
    accessories: stageAccessories(s.extras),
    legs,
    miles,
    minutes,
    ferries,
    sand,
    daysNeeded,
    complete: {
      1: true,
      2: s.extras.length > 0,
      3: s.stops.length > 0,
      4: avail.state === 'free',
    } as Record<1 | 2 | 3 | 4, boolean>,
  }
}

/* ---------- share links ---------- */

export function encodeTrip(s: TripState) {
  const data = { b: s.base, f: s.from, t: s.to, p: s.paint, r: s.roof, e: s.extras, s: s.stops }
  return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeTrip(code: string): Partial<TripState> | null {
  try {
    const d = JSON.parse(atob(code.replace(/-/g, '+').replace(/_/g, '/')))
    const out: Partial<TripState> = {}
    if (typeof d.b === 'string' && ['boston', 'cape-cod', 'marthas-vineyard', 'nantucket'].includes(d.b)) out.base = d.b
    if (typeof d.f === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.f)) out.from = d.f
    if (typeof d.t === 'string' && /^\d{4}-\d\d-\d\d$/.test(d.t)) out.to = d.t
    if (typeof d.p === 'string' && d.p in paints) out.paint = d.p
    if (d.r === 'sky' || d.r === 'hardtop') out.roof = d.r
    if (Array.isArray(d.e)) out.extras = d.e.filter((x: unknown) => typeof x === 'string' && ['surf', 'kayak', 'traction', 'cooler', 'child-seat'].includes(x as string))
    if (Array.isArray(d.s)) out.stops = d.s.filter((x: unknown) => typeof x === 'string').filter((id: string) => { try { return !!spotById(id) } catch { return false } })
    return out
  } catch {
    return null
  }
}

/* ---------- context ---------- */

type Ctx = { s: TripState; d: ReturnType<typeof derive>; dispatch: Dispatch<Action> }
const TripCtx = createContext<Ctx | null>(null)

function init(): TripState {
  const code = new URLSearchParams(window.location.search).get('trip')
  const restored = code ? decodeTrip(code) : null
  if (!restored) return initialTrip
  const merged = { ...initialTrip, ...restored }
  // the restored paint and roof must name a Jeep that exists at that base
  const v = pick(merged.base, merged.paint, merged.roof, merged.from, merged.to)
  return { ...merged, paint: v.paint, roof: v.roof, step: 4 }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, init)
  const d = useMemo(() => derive(s), [s])
  const value = useMemo(() => ({ s, d, dispatch }), [s, d])
  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>
}

export function useTrip() {
  const v = useContext(TripCtx)
  if (!v) throw new Error('useTrip must be used inside <TripProvider>')
  return v
}

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`
