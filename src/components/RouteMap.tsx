import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { islets, waters } from '../data/coast'
import { baseById, spots, type BaseId, type Spot } from '../data/places'
import { bbox, coast, fit, islandOfNode, nodeXY, regionBox, roadPaths, type Box } from '../lib/chart'
import { project } from '../lib/geo'
import type { Leg } from '../lib/route'
import { Icon } from './Icon'
import './RouteMap.css'

/*
  The chart the trip is planned on.

  SVG holds the geography (sea, land, roads, the plotted route). Pins, labels
  and the little Jeep are HTML laid over it, repositioned each frame while the
  view glides, so text stays crisp at any zoom. Nothing animates unless the
  visitor changed something: adding a stop drives the Jeep along the new leg.
*/

type Props = {
  base: BaseId
  stops: string[]
  legs: Leg[]
  paint: string
  active: boolean
  focus: string | null
  onFocus: (id: string | null) => void
  onToggle: (id: string) => void
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function lengths(pts: [number, number][]) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return acc
}
/** Point, heading and segment index at distance s along a polyline. */
function along(pts: [number, number][], acc: number[], s: number) {
  let i = 1
  while (i < acc.length - 1 && acc[i] < s) i++
  const seg = acc[i] - acc[i - 1] || 1
  const t = Math.min(1, Math.max(0, (s - acc[i - 1]) / seg))
  const a = pts[i - 1]
  const b = pts[i]
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle: Math.atan2(b[1] - a[1], b[0] - a[0]), seg: i - 1 }
}
const toD = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

export function RouteMap({ base, stops, legs, paint, active, focus, onFocus, onToggle }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const pinLayer = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const partial = useRef<SVGPathElement>(null)
  const [wide, setWide] = useState(false)
  const [driving, setDriving] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const b = baseById(base)
  const startXY = nodeXY.get(b.node)!
  const visibleSpots = spots

  // what the camera should frame
  const target = useMemo(() => {
    const aspect = size.w / Math.max(1, size.h)
    if (wide) return fit({ x: 0, y: -60, w: 1000, h: 1100 }, aspect, 0.02)
    const region = regionBox(b.island, base)
    const pts: [number, number][] = [[region.x, region.y], [region.x + region.w, region.y + region.h]]
    for (const l of legs) pts.push(...l.points)
    // Pin labels are HTML at a fixed pixel size, so on a small screen they
    // need more chart around them. Pad by their width in chart units and refit.
    const content = bbox(pts)
    let f = fit(content, aspect)
    for (let i = 0; i < 2; i++) {
      const perPx = f.w / Math.max(1, size.w)
      const padX = Math.min(96, Math.max(40, size.w * 0.12)) * perPx
      const padY = 22 * perPx
      f = fit({ x: content.x - padX, y: content.y - padY, w: content.w + padX * 2, h: content.h + padY * 2 }, aspect, 0.04)
    }
    return f
  }, [wide, legs, b.island, base, size])

  const view = useRef<Box>(target)
  const anim = useRef<{ from: Box; to: Box; t: number } | null>(null)
  const drive = useRef<{ leg: number; pts: [number, number][]; acc: number[]; ferry: [number, number][]; s: number; total: number; dur: number; t: number } | null>(null)
  const raf = useRef(0)
  const prevStops = useRef(stops)

  // where the Jeep rests: the last stop, or the start
  const rest = useMemo(() => {
    if (!stops.length || legs.length < 2) return { x: startXY[0], y: startXY[1], angle: 0 }
    const l = legs[legs.length - 2]
    const p = l.points
    const a = p[Math.max(0, p.length - 2)]
    const z = p[p.length - 1]
    return { x: z[0], y: z[1], angle: Math.atan2(z[1] - a[1], z[0] - a[0]) }
  }, [stops, legs, startXY])

  const sizeRef = useRef(size)
  sizeRef.current = size
  const restRef = useRef(rest)
  restRef.current = rest

  const place = () => {
    const v = view.current
    const W = sizeRef.current.w
    const H = sizeRef.current.h
    svg.current?.setAttribute('viewBox', `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`)
    svg.current?.style.setProperty('--z', (v.w / W).toFixed(4))
    const sx = (x: number) => ((x - v.x) / v.w) * W
    const sy = (y: number) => ((y - v.y) / v.h) * H
    pinLayer.current?.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => {
      const px = sx(+el.dataset.x!)
      el.style.transform = `translate(${px.toFixed(1)}px, ${sy(+el.dataset.y!).toFixed(1)}px)`
      // a label that would run off the side of the chart swaps sides
      if (px < 120) el.dataset.edge = 'l'
      else if (px > W - 120) el.dataset.edge = 'r'
      else delete el.dataset.edge
    })
    if (wrap.current) wrap.current.dataset.near = v.w < 560 && W > 520 ? 'true' : 'false'
    let m = restRef.current
    let ferry = false
    const dr = drive.current
    if (dr) {
      const p = along(dr.pts, dr.acc, dr.s)
      m = p
      ferry = dr.ferry.some(([a, z]) => p.seg >= a && p.seg < z)
      const done: [number, number][] = []
      for (let i = 0; i <= p.seg; i++) done.push(dr.pts[i])
      done.push([p.x, p.y])
      partial.current?.setAttribute('d', toD(done))
    }
    if (marker.current) {
      const deg = (m.angle * 180) / Math.PI
      marker.current.style.transform = `translate(${sx(m.x).toFixed(1)}px, ${sy(m.y).toFixed(1)}px)`
      marker.current.style.setProperty('--heading', `${deg.toFixed(1)}deg`)
      marker.current.dataset.ferry = ferry ? 'true' : 'false'
    }
  }

  const loop = (last: number) => (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000)
    let busy = false
    const a = anim.current
    if (a) {
      a.t = Math.min(1, a.t + dt / 0.95)
      const k = ease(a.t)
      view.current = {
        x: a.from.x + (a.to.x - a.from.x) * k,
        y: a.from.y + (a.to.y - a.from.y) * k,
        w: a.from.w * Math.pow(a.to.w / a.from.w, k),
        h: a.from.h * Math.pow(a.to.h / a.from.h, k),
      }
      if (a.t >= 1) anim.current = null
      busy = true
    }
    const dr = drive.current
    if (dr) {
      dr.t = Math.min(1, dr.t + dt / dr.dur)
      dr.s = ease(dr.t) * dr.total
      if (dr.t >= 1) {
        drive.current = null
        setDriving(null)
      } else busy = true
    }
    place()
    raf.current = busy ? requestAnimationFrame(loop(now)) : 0
  }
  const kick = () => {
    if (!raf.current) raf.current = requestAnimationFrame(loop(performance.now()))
  }

  // size
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // glide to the new frame
  useEffect(() => {
    if (!active || reduced()) {
      view.current = target
      anim.current = null
      place()
      return
    }
    anim.current = { from: view.current, to: target, t: 0 }
    kick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active])

  // a new stop at the end: drive the leg to it
  useEffect(() => {
    const before = prevStops.current
    prevStops.current = stops
    const added = stops.length === before.length + 1 && before.every((s, i) => s === stops[i])
    if (!added || !active || reduced() || legs.length < 2) {
      drive.current = null
      setDriving(null)
      place()
      return
    }
    const idx = stops.length - 1
    const leg = legs[idx]
    const acc = lengths(leg.points)
    const total = acc[acc.length - 1]
    drive.current = { leg: idx, pts: leg.points, acc, ferry: leg.ferrySpans, s: 0, total, dur: Math.min(2.6, 0.8 + total / 260), t: 0 }
    setDriving(idx)
    kick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops])

  useEffect(() => {
    place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, rest])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const drawn = legs.filter((l, i) => (driving === null ? true : i < driving) && !(driving !== null && l.returning))
  const order = (id: string) => stops.indexOf(id)

  return (
    <div className="rmap" ref={wrap} data-near="true">
      <svg ref={svg} className="rmap__svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect x="-2000" y="-2000" width="5000" height="5000" fill="var(--sea-1)" />
        <g className="rmap__shoal">
          {coast.map((d, i) => <path key={`a${i}`} d={d} strokeWidth="44" stroke="#c9dceb" />)}
          {coast.map((d, i) => <path key={`b${i}`} d={d} strokeWidth="14" stroke="#b6d0e3" />)}
        </g>
        <g className="rmap__land">
          {coast.map((d, i) => <path key={i} d={d} />)}
          {islets.map(([lat, lon, rx, ry, rot], i) => {
            const [x, y] = project(lat, lon)
            return <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />
          })}
        </g>
        <g className="rmap__waters">
          {waters.map((w) => {
            const [x, y] = project(w.lat, w.lon)
            return (
              <text key={w.name} x={x} y={y} textAnchor="middle" style={{ ['--fs' as string]: (w.size ?? 20) / 20 }} transform={w.rotate ? `rotate(${w.rotate} ${x} ${y})` : undefined}>
                {w.name}
              </text>
            )
          })}
        </g>
        <g className="rmap__roads">
          {roadPaths.filter((r) => r.kind !== 'ferry').map((r, i) => <path key={`c${i}`} className={`rmap__casing rmap__casing--${r.kind}`} d={r.d} />)}
          {roadPaths.map((r, i) => <path key={i} className={`rmap__road rmap__road--${r.kind}`} d={r.d} />)}
        </g>
        <g className="rmap__route">
          {drawn.map((l) => <path key={`${l.from}-${l.to}-${l.returning}`} className={l.returning ? 'is-return' : ''} d={toD(l.points)} />)}
          {driving !== null && <path ref={partial} className="is-live" d="" />}
        </g>
      </svg>

      <div className="rmap__pins" ref={pinLayer}>
        <div className="rpin rpin--start" data-x={startXY[0]} data-y={startXY[1]} data-left={b.labelLeft || undefined}>
          <span className="rpin__dot"><Icon name="pin" size={15} /></span>
          <span className="rpin__label">{b.id === 'boston' ? 'Boston' : b.where.split(',')[0]}<small>Pick-up</small></span>
        </div>
        {visibleSpots.map((s: Spot) => {
          const [x, y] = nodeXY.get(s.node)!
          const n = order(s.id)
          const far = islandOfNode.get(s.node) !== b.island
          return (
            <button
              key={s.id}
              className="rpin"
              data-x={x}
              data-y={y}
              data-on={n >= 0 || undefined}
              data-focus={focus === s.id || undefined}
              data-far={far || undefined}
              data-left={s.labelLeft || undefined}
              aria-pressed={n >= 0}
              aria-label={`${n >= 0 ? 'Remove' : 'Add'} ${s.name}`}
              onClick={() => onToggle(s.id)}
              onPointerEnter={() => onFocus(s.id)}
              onPointerLeave={() => onFocus(null)}
              onFocus={() => onFocus(s.id)}
              onBlur={() => onFocus(null)}
              tabIndex={active ? 0 : -1}
            >
              <span className="rpin__dot">{n >= 0 ? n + 1 : <Icon name={s.kind} size={15} />}</span>
              <span className="rpin__label">{s.name}</span>
            </button>
          )
        })}
        <div className="rmarker" ref={marker} aria-hidden="true">
          <svg className="rmarker__jeep" viewBox="0 0 34 20" width="34" height="20">
            <rect x="1" y="2" width="32" height="16" rx="4" fill={paint} stroke="#0b2540" strokeOpacity=".35" />
            <rect x="9" y="4" width="15" height="12" rx="2" fill="#16191d" />
            <rect x="24" y="5" width="5" height="10" rx="1.5" fill="#9fb3c6" />
            <g fill="#16191d"><rect x="5" y="0" width="7" height="3" rx="1" /><rect x="5" y="17" width="7" height="3" rx="1" /><rect x="23" y="0" width="7" height="3" rx="1" /><rect x="23" y="17" width="7" height="3" rx="1" /></g>
          </svg>
          <svg className="rmarker__ferry" viewBox="0 0 36 22" width="36" height="22">
            <path d="M2 11 L8 3 H30 Q35 11 30 19 H8 Z" fill="#fff" stroke="#0b2540" strokeWidth="1.5" />
            <rect x="12" y="7" width="12" height="8" rx="2" fill={paint} />
          </svg>
        </div>
      </div>

      <div className="rmap__tools">
        <button className="rmap__btn" onClick={() => setWide((w) => !w)} tabIndex={active ? 0 : -1}>
          <Icon name="expand" size={16} />
          {wide ? `Back to ${b.short}` : 'See the whole map'}
        </button>
      </div>
      <p className="rmap__legend">
        <span><i className="is-ferry" /> Car ferry</span>
        <span><i className="is-sand" /> Sand track, permit needed</span>
      </p>
    </div>
  )
}
