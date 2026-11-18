import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { islets, waters } from '../data/coast'
import { fleetAt } from '../data/fleet'
import { bases, spots, type BaseId } from '../data/places'
import { bbox, coast, fit, nodeXY, roadPaths } from '../lib/chart'
import { project } from '../lib/geo'
import { Icon } from './Icon'
import './PlaceMap.css'

/*
  Choosing where the Jeep meets you, on the chart itself: the four pick-up
  points as pins on the Cape and Islands, with the ferries between them, and
  the same four as a list beside it. Hovering either lights up the other.
*/

/** which side each pin's label sits on, so none runs off the chart */
const LABEL_LEFT: Partial<Record<BaseId, boolean>> = { nantucket: true, 'marthas-vineyard': true }

export const baseFacts = Object.fromEntries(
  bases.map((b) => {
    const jeeps = fleetAt(b.id)
    return [b.id, { count: jeeps.length, from: Math.min(...jeeps.map((v) => v.dayRate)) }]
  }),
) as Record<BaseId, { count: number; from: number }>

type Props = {
  value: BaseId
  hover: BaseId | null
  onHover: (b: BaseId | null) => void
  onPick: (b: BaseId) => void
}

export function PlaceMap({ value, hover, onHover, onPick }: Props) {
  // the chart is framed to whatever shape the box has, so pins and map agree
  const el = useRef<HTMLDivElement>(null)
  const [aspect, setAspect] = useState(0.92)
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const measure = () => {
      const r = node.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setAspect(r.width / r.height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])
  const box = useMemo(() => {
    const pts = bases.map((b) => nodeXY.get(b.node)!)
    const b = bbox(pts)
    return fit({ x: b.x - 30, y: b.y - 6, w: b.w + 110, h: b.h + 16 }, aspect, 0.08)
  }, [aspect])
  const u = box.w / 100
  const pct = (x: number, y: number) => ({ left: `${((x - box.x) / box.w) * 100}%`, top: `${((y - box.y) / box.h) * 100}%` })

  return (
    <div className="pmap" ref={el}>
      <svg className="pmap__svg" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
        <rect x={box.x} y={box.y} width={box.w} height={box.h} className="pmap__sea" />
        <g className="pmap__shoal">
          {coast.map((d, i) => <path key={i} d={d} strokeWidth={u * 4} />)}
        </g>
        <g className="pmap__land">
          {coast.map((d, i) => <path key={i} d={d} />)}
          {islets.map(([lat, lon, rx, ry, rot], i) => {
            const [x, y] = project(lat, lon)
            return <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />
          })}
        </g>
        <g className="pmap__waters">
          {waters.map((w) => {
            const [x, y] = project(w.lat, w.lon)
            return (
              <text key={w.name} x={x} y={y} textAnchor="middle" fontSize={u * 2.6 * ((w.size ?? 20) / 24)} transform={w.rotate ? `rotate(${w.rotate} ${x} ${y})` : undefined}>
                {w.name}
              </text>
            )
          })}
        </g>
        <g className="pmap__roads">
          {roadPaths.filter((r) => r.kind !== 'ferry').map((r, i) => <path key={i} d={r.d} data-kind={r.kind} />)}
          {roadPaths.filter((r) => r.kind === 'ferry').map((r, i) => <path key={`f${i}`} d={r.d} data-kind="ferry" />)}
        </g>
        <g className="pmap__spots">
          {spots.map((s) => {
            const [x, y] = nodeXY.get(s.node)!
            return <circle key={s.id} cx={x} cy={y} r={u * 0.7} />
          })}
        </g>
      </svg>

      {bases.map((b) => {
        const [x, y] = nodeXY.get(b.node)!
        const f = baseFacts[b.id]
        return (
          <button
            key={b.id}
            type="button"
            className="pmap__pin"
            style={pct(x, y)}
            data-left={LABEL_LEFT[b.id] || undefined}
            data-on={b.id === value || undefined}
            data-hover={b.id === hover || undefined}
            aria-pressed={b.id === value}
            aria-label={`${b.name}: ${f.count} Jeeps, from $${f.from} a day`}
            onPointerEnter={() => onHover(b.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(b.id)}
            onBlur={() => onHover(null)}
            onClick={() => onPick(b.id)}
          >
            <span className="pmap__dot">
              <Icon name="pin" size={14} />
            </span>
            <span className="pmap__label">
              {b.short}
              <small>from ${f.from}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The same four places as a list, for reading and for keyboards. */
export function PlaceList({ value, hover, onHover, onPick }: Props) {
  return (
    <ul className="plist" role="list">
      {bases.map((b) => {
        const f = baseFacts[b.id]
        return (
          <li key={b.id}>
            <button
              type="button"
              className="plist__opt"
              aria-pressed={b.id === value}
              data-hover={b.id === hover || undefined}
              onPointerEnter={() => onHover(b.id)}
              onPointerLeave={() => onHover(null)}
              onClick={() => onPick(b.id)}
            >
              <span className="plist__text">
                <strong>{b.name}</strong>
                <small>{b.where}</small>
              </span>
              <span className="plist__meta">
                <b>from ${f.from}</b>
                <small>{f.count} Jeeps</small>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
