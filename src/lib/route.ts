import { nodes, roads, type Road, type RoadKind } from '../data/roads'
import { milesBetween, project, type LatLon } from './geo'

/*
  Route planning over the road network: shortest paths by time (Dijkstra),
  legs between consecutive stops, a loop back to the pickup, and a brute-force
  "shortest order" for up to seven stops.
*/
const WINDING = 1.18
const MPH: Record<Exclude<RoadKind, 'ferry'>, number> = { highway: 52, road: 27, sand: 9 }

type Edge = { to: string; road: Road; miles: number; minutes: number; pts: LatLon[] }
const nodeById = new Map(nodes.map((n) => [n.id, n]))
const adj = new Map<string, Edge[]>()

function polyline(r: Road, from: string): LatLon[] {
  const a = nodeById.get(r.a)!
  const b = nodeById.get(r.b)!
  const pts: LatLon[] = [[a.lat, a.lon], ...(r.via ?? []), [b.lat, b.lon]]
  return from === r.a ? pts : pts.reverse()
}
const lengthOf = (pts: LatLon[]) => pts.slice(1).reduce((s, p, i) => s + milesBetween(pts[i], p), 0)

for (const r of roads) {
  for (const [from, to] of [[r.a, r.b], [r.b, r.a]]) {
    const pts = polyline(r, from)
    const raw = lengthOf(pts)
    const miles = r.kind === 'ferry' ? raw : raw * WINDING
    const minutes = r.kind === 'ferry' ? r.minutes ?? 60 : (miles / MPH[r.kind]) * 60 + (r.kind === 'sand' ? 8 : 0)
    if (!adj.has(from)) adj.set(from, [])
    adj.get(from)!.push({ to, road: r, miles, minutes, pts })
  }
}

type Path = { minutes: number; miles: number; edges: Edge[] }
const cache = new Map<string, Path>()

export function shortestPath(from: string, to: string): Path {
  const key = `${from}>${to}`
  const hit = cache.get(key)
  if (hit) return hit
  const dist = new Map<string, number>([[from, 0]])
  const prev = new Map<string, Edge & { from: string }>()
  const open = new Set([from])
  while (open.size) {
    let cur = ''
    let best = Infinity
    for (const n of open) if ((dist.get(n) ?? Infinity) < best) { best = dist.get(n)!; cur = n }
    open.delete(cur)
    if (cur === to) break
    for (const e of adj.get(cur) ?? []) {
      const d = best + e.minutes
      if (d < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, d)
        prev.set(e.to, { ...e, from: cur })
        open.add(e.to)
      }
    }
  }
  const edges: Edge[] = []
  for (let n = to; n !== from; ) {
    const e = prev.get(n)
    if (!e) break
    edges.unshift(e)
    n = e.from
  }
  const path = { minutes: edges.reduce((s, e) => s + e.minutes, 0), miles: edges.reduce((s, e) => s + e.miles, 0), edges }
  cache.set(key, path)
  return path
}

export type Leg = {
  from: string
  to: string
  miles: number
  minutes: number
  ferries: string[]
  sand: boolean
  /** projected chart points, in order */
  points: [number, number][]
  /** which stretches of `points` are on a ferry, as [startIndex, endIndex] */
  ferrySpans: [number, number][]
  returning: boolean
}

export function planLegs(startNode: string, stopNodes: string[]): Leg[] {
  if (!stopNodes.length) return []
  const seq = [startNode, ...stopNodes, startNode]
  const legs: Leg[] = []
  for (let i = 0; i < seq.length - 1; i++) {
    const p = shortestPath(seq[i], seq[i + 1])
    const pts: [number, number][] = []
    const ferrySpans: [number, number][] = []
    for (const e of p.edges) {
      const start = Math.max(0, pts.length - 1)
      for (const [lat, lon] of e.pts) {
        const q = project(lat, lon)
        const last = pts[pts.length - 1]
        if (!last || last[0] !== q[0] || last[1] !== q[1]) pts.push(q)
      }
      if (e.road.kind === 'ferry') ferrySpans.push([start, pts.length - 1])
    }
    legs.push({
      from: seq[i],
      to: seq[i + 1],
      miles: p.miles,
      minutes: p.minutes,
      ferries: p.edges.filter((e) => e.road.kind === 'ferry').map((e) => e.road.name ?? 'Car ferry'),
      sand: p.edges.some((e) => e.road.kind === 'sand'),
      points: pts,
      ferrySpans,
      returning: i === seq.length - 2,
    })
  }
  return legs
}

const permutations = <T,>(xs: T[]): T[][] =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))

/** Reorders stops for the quickest loop. Returns null if the order is already best. */
export function bestOrder(startNode: string, stopNodes: string[]): { order: number[]; savedMinutes: number } | null {
  if (stopNodes.length < 2 || stopNodes.length > 7) return null
  const cost = (order: number[]) => {
    let t = 0
    let at = startNode
    for (const i of order) { t += shortestPath(at, stopNodes[i]).minutes; at = stopNodes[i] }
    return t + shortestPath(at, startNode).minutes
  }
  const current = stopNodes.map((_, i) => i)
  const now = cost(current)
  let best = current
  let bestT = now
  for (const p of permutations(current)) {
    const t = cost(p)
    if (t < bestT - 0.5) { best = p; bestT = t }
  }
  return bestT < now - 3 ? { order: best, savedMinutes: now - bestT } : null
}

export const formatMinutes = (m: number) => {
  const r = Math.max(5, Math.round(m / 5) * 5)
  const h = Math.floor(r / 60)
  const mm = r % 60
  return h ? (mm ? `${h} h ${mm} min` : `${h} h`) : `${mm} min`
}
