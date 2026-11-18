import { mainland, marthasVineyard, nantucket } from '../data/coast'
import type { BaseId, Island } from '../data/places'
import { nodes, roads } from '../data/roads'
import { project, smoothClosed } from './geo'

/* Geometry shared by the route map and the place cards. */

export type Box = { x: number; y: number; w: number; h: number }

export const nodeXY = new Map(nodes.map((n) => [n.id, project(n.lat, n.lon)]))
export const islandOfNode = new Map(nodes.map((n) => [n.id, n.island]))
export const coast = [smoothClosed(mainland), smoothClosed(marthasVineyard), smoothClosed(nantucket)]
export const roadPaths = roads.map((r) => {
  const a = nodes.find((n) => n.id === r.a)!
  const b = nodes.find((n) => n.id === r.b)!
  const pts = [[a.lat, a.lon], ...(r.via ?? []), [b.lat, b.lon]].map(([lat, lon]) => project(lat, lon))
  return { kind: r.kind, island: a.island, d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') }
})

export function regionBox(island: Island, base: BaseId): Box {
  const pts = nodes
    .filter((n) => n.island === island && (base === 'boston' || n.id !== 'boston') && (island !== 'mainland' || n.id !== 'plymouth' || base === 'boston'))
    .map((n) => nodeXY.get(n.id)!)
  return bbox(pts)
}
export function bbox(pts: [number, number][]): Box {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }
}
export function fit(b: Box, aspect: number, pad = 0.16, minW = 170): Box {
  // leave room either side for pin labels, which sit beside their dots
  const labelRoom = 34
  b = { x: b.x - labelRoom, y: b.y - 12, w: b.w + labelRoom * 2, h: b.h + 24 }
  let w = Math.max(b.w * (1 + pad * 2), minW)
  let h = Math.max(b.h * (1 + pad * 2), minW / aspect)
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h }
}
