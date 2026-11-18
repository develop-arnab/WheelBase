import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { islets, waters } from '../data/coast'
import { fleetAt } from '../data/fleet'
import { bases, spots, type Base, type BaseId, type SpotKind } from '../data/places'
import { nodes } from '../data/roads'
import { coast, fit, nodeXY, regionBox, roadPaths } from '../lib/chart'
import { project } from '../lib/geo'
import { useInView } from '../lib/reveal'
import { scrollToBuilder } from '../lib/scroll'
import { useTrip } from '../lib/trip'
import { Icon, type IconName } from './Icon'
import './Places.css'

/*
  The four pick-up points as a chart table: the harbours listed down one
  side, a large chart of the chosen one beside them, with the places worth
  driving to marked and described. "Start here" opens the builder there.
*/

const KIND_ICON: Record<SpotKind, IconName> = {
  lighthouse: 'lighthouse',
  beach: 'beach',
  town: 'town',
  harbor: 'harbor',
  cliffs: 'cliffs',
  dunes: 'dunes',
}

/** 41.2835 → 41°17′ N, as a chart would print it */
function dm(v: number, pos: string, neg: string) {
  const a = Math.abs(v)
  const d = Math.floor(a)
  const m = Math.round((a - d) * 60)
  return `${d}°${String(m).padStart(2, '0')}′ ${v >= 0 ? pos : neg}`
}
function coords(b: Base) {
  const n = nodes.find((x) => x.id === b.node)!
  return `${dm(n.lat, 'N', 'S')}, ${dm(n.lon, 'E', 'W')}`
}

function Chart({ base }: { base: Base }) {
  const el = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 560 })
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const measure = () => {
      const r = node.getBoundingClientRect()
      if (r.width && r.height) setSize({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const here = spots.filter((s) => s.island === base.island)
  const box = useMemo(() => {
    // room for the pin labels, which are a fixed size on screen
    const content = regionBox(base.island, base.id)
    let f = fit(content, size.w / size.h, 0.06)
    for (let i = 0; i < 2; i++) {
      const per = f.w / size.w
      const px = Math.min(110, size.w * 0.16) * per
      const py = 34 * per
      f = fit({ x: content.x - px, y: content.y - py, w: content.w + px * 2, h: content.h + py * 2 }, size.w / size.h, 0.02)
    }
    return f
  }, [base, size])
  const u = box.w / 100
  const at = (x: number, y: number) => ({ left: `${((x - box.x) / box.w) * 100}%`, top: `${((y - box.y) / box.h) * 100}%` })
  const [bx, by] = nodeXY.get(base.node)!

  return (
    <div className="ptable__chart" ref={el}>
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true">
        <rect x={box.x} y={box.y} width={box.w} height={box.h} className="pc__sea" />
        <g className="pc__shoal">
          {coast.map((d, i) => <path key={i} d={d} strokeWidth={u * 4} />)}
        </g>
        <g className="pc__land">
          {coast.map((d, i) => <path key={i} d={d} />)}
          {islets.map(([lat, lon, rx, ry, rot], i) => {
            const [x, y] = project(lat, lon)
            return <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />
          })}
        </g>
        <g className="pc__waters">
          {waters.map((w) => {
            const [x, y] = project(w.lat, w.lon)
            return (
              <text key={w.name} x={x} y={y} textAnchor="middle" fontSize={u * 2.4 * ((w.size ?? 20) / 24)} transform={w.rotate ? `rotate(${w.rotate} ${x} ${y})` : undefined}>
                {w.name}
              </text>
            )
          })}
        </g>
        <g className="pc__roads">
          {roadPaths.filter((r) => r.kind !== 'ferry').map((r, i) => <path key={i} d={r.d} data-kind={r.kind} />)}
          {roadPaths.filter((r) => r.kind === 'ferry').map((r, i) => <path key={`f${i}`} d={r.d} data-kind="ferry" />)}
        </g>
      </svg>
      {here.map((s, i) => {
        const [x, y] = nodeXY.get(s.node)!
        return (
          <span key={`${base.id}-${s.id}`} className="pc__spot" style={{ ...at(x, y), '--i': i } as CSSProperties} data-left={s.labelLeft || undefined}>
            <i>
              <Icon name={KIND_ICON[s.kind]} size={14} />
            </i>
            <b>{s.name}</b>
          </span>
        )
      })}
      <span className="pc__base" style={at(bx, by)}>
        <i>
          <Icon name="key" size={15} />
        </i>
        <b>Pick up here</b>
      </span>
      <p className="pc__coords chart-voice">{coords(base)}</p>
    </div>
  )
}

export function Places() {
  const { s, dispatch } = useTrip()
  const [ref, seen] = useInView<HTMLElement>()
  const [sel, setSel] = useState<BaseId>(s.base)
  const base = bases.find((b) => b.id === sel)!
  const jeeps = fleetAt(base.id)
  const from = Math.min(...jeeps.map((v) => v.dayRate))
  const here = spots.filter((p) => p.island === base.island)

  const start = () => {
    dispatch({ type: 'base', base: base.id })
    dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }

  return (
    <section className="places sect sect--sea" id="places" ref={ref} data-shown={seen || undefined} aria-labelledby="places-title">
      <div className="wrap">
        <header className="shead">
          <h2 className="shead__title" id="places-title" data-reveal>
            Four harbours. A Jeep waiting at each.
          </h2>
          <p className="shead__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
            Off the ferry on either island, in Hyannis for the Cape, or near Logan for the drive down. Choose one to see what’s within reach.
          </p>
        </header>

        <div className="ptable" data-reveal style={{ '--d': '0.15s' } as CSSProperties}>
          <ul className="ptable__list" role="tablist" aria-label="Pick-up places">
            {bases.map((b) => {
              const n = fleetAt(b.id)
              return (
                <li key={b.id}>
                  <button type="button" role="tab" aria-selected={b.id === sel} aria-controls="place-panel" className="ptable__tab" onClick={() => setSel(b.id)}>
                    <span className="ptable__name">{b.name}</span>
                    <span className="ptable__where">{b.where}</span>
                    <span className="ptable__meta">
                      {n.length} Jeeps, from ${Math.min(...n.map((v) => v.dayRate))} a day
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="ptable__panel" id="place-panel" role="tabpanel" aria-label={base.name}>
            <Chart key={base.id} base={base} />
            <div className="ptable__foot">
              <div className="ptable__summary">
                <p className="ptable__title display">{base.name}</p>
                <p>
                  {jeeps.length} Jeeps waiting in {base.where.split(',')[0]}, from <strong>${from}</strong> a day.
                </p>
              </div>
              <button type="button" className="btn btn--book ptable__go" onClick={start}>
                Start in {base.short}
              </button>
            </div>
            <ul className="notes">
              {here.map((p) => (
                <li key={p.id}>
                  <i>
                    <Icon name={KIND_ICON[p.kind]} size={18} />
                  </i>
                  <div>
                    <strong>
                      {p.name}
                      {p.sand && <span className="notes__sand">Over-sand</span>}
                    </strong>
                    <p>{p.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
