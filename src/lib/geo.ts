/*
  Chart toolkit: an equirectangular projection tuned to the Cape, distances,
  bearings and a path smoother for the coastline.
*/
export type LatLon = [lat: number, lon: number]

export const CHART = { north: 42.14, south: 41.19, west: -71.06, east: -69.84, width: 1000 }

const midLat = ((CHART.north + CHART.south) / 2) * (Math.PI / 180)
const scale = CHART.width / ((CHART.east - CHART.west) * Math.cos(midLat))
export const CHART_HEIGHT = Math.round((CHART.north - CHART.south) * scale)
/** Chart units per statute mile */
export const PX_PER_MILE = scale / 69.05

export function project(lat: number, lon: number): [number, number] {
  return [
    Math.round((lon - CHART.west) * Math.cos(midLat) * scale * 10) / 10,
    Math.round((CHART.north - lat) * scale * 10) / 10,
  ]
}

const rad = (d: number) => (d * Math.PI) / 180

export function milesBetween(a: LatLon, b: LatLon) {
  const R = 3958.8
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function smoothClosed(coords: LatLon[]) {
  const p = coords.map(([lat, lon]) => project(lat, lon))
  const n = p.length
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n]
    const p1 = p[i]
    const p2 = p[(i + 1) % n]
    const p3 = p[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return d + ' Z'
}

/** Open polyline through projected points, softened at the joints. */
export function smoothOpen(pts: [number, number][]) {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += ` Q${x} ${y} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`
  }
  const l = pts[pts.length - 1]
  return `${d} L${l[0]} ${l[1]}`
}
