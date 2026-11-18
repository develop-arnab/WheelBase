import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fleet, MODEL, paintOrder, paints, roofs, SEATS, type PaintId, type Roof } from '../data/fleet'
import { baseById, bases } from '../data/places'
import { useInView } from '../lib/reveal'
import { scrollToBuilder } from '../lib/scroll'
import { prefetchStills, useStill } from '../lib/stills'
import { useTrip } from '../lib/trip'
import { Icon } from './Icon'
import { Jeep } from './Jeep'
import './Fleet.css'

/*
  The fleet, as a paint lineup. Every picture is a still drawn from the same
  3D model as the builder, so what you see here is what you'll configure.
  Choosing a paint shows where that colour is waiting; "Build this one" opens
  the builder on that Jeep.
*/

type Combo = { paint: PaintId; roof: Roof }

function stats(paint: PaintId) {
  const jeeps = fleet.filter((v) => v.paint === paint)
  const places = bases.filter((b) => jeeps.some((v) => v.base === b.id)).map((b) => ({ base: b, count: jeeps.filter((v) => v.base === b.id).length }))
  const roofsHere = (['sky', 'hardtop'] as Roof[]).filter((r) => jeeps.some((v) => v.roof === r))
  return { jeeps, places, roofs: roofsHere, from: Math.min(...jeeps.map((v) => v.dayRate)) }
}

function Still({ paint, roof, eager, className }: Combo & { eager: boolean; className?: string }) {
  const hex = paints[paint].hex
  const url = useStill({ paint: hex, roof, angle: 'hero' }, eager)
  return (
    <span className={`still ${className ?? ''}`} data-ready={url ? true : undefined}>
      {url ? <img src={url} alt="" draggable={false} /> : <Jeep paint={hex} roof="closed" className="still__fallback" />}
    </span>
  )
}

export function Fleet() {
  const { s, dispatch } = useTrip()
  const [ref, seen] = useInView<HTMLElement>('0px 0px 40% 0px')
  const [paint, setPaint] = useState<PaintId>('blue')
  const info = useMemo(() => stats(paint), [paint])
  const [roof, setRoof] = useState<Roof>(info.roofs[0])
  useEffect(() => {
    if (!info.roofs.includes(roof)) setRoof(info.roofs[0])
  }, [info, roof])

  // draw every paint's picture once the section is close
  useEffect(() => {
    if (!seen) return
    prefetchStills(paintOrder.flatMap((p) => stats(p).roofs.map((r) => ({ paint: paints[p].hex, roof: r, angle: 'hero' as const }))))
  }, [seen])

  const build = () => {
    const here = info.jeeps.filter((v) => v.roof === roof)
    const v = here.find((x) => x.base === s.base) ?? here[0] ?? info.jeeps[0]
    dispatch({ type: 'vehicle', vehicle: v })
    dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }

  return (
    <section className="fleet sect sect--paper" id="fleet" ref={ref} data-shown={seen || undefined} aria-labelledby="fleet-title">
      <div className="wrap">
        <header className="shead shead--split">
          <h2 className="shead__title" id="fleet-title" data-reveal>
            Six colours. Every one a Rubicon.
          </h2>
          <p className="shead__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
            2025 and 2026 Wrangler Rubicons with leather and low miles, kept on the Cape and the islands. Pick a colour to see where it’s waiting.
          </p>
        </header>

        <div className="showroom" data-reveal style={{ '--d': '0.15s' } as CSSProperties}>
          <div className="showroom__floor">
            <Still key={`${paint}-${roof}`} paint={paint} roof={roof} eager={seen} className="showroom__car" />
            <div className="showroom__roof" role="radiogroup" aria-label="Roof">
              {(['sky', 'hardtop'] as Roof[]).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={roof === r} disabled={!info.roofs.includes(r)} onClick={() => setRoof(r)} title={info.roofs.includes(r) ? undefined : `No ${roofs[r].name.toLowerCase()} in this colour yet`}>
                  {r === 'sky' ? 'Sky roof' : 'Hardtop'}
                </button>
              ))}
            </div>
          </div>

          <div className="showroom__card">
            <p className="showroom__paint display">{paints[paint].name}</p>
            <p className="showroom__model">
              {MODEL}, {roofs[roof].name.toLowerCase()}
            </p>
            <div className="showroom__where">
              <p className="showroom__label">Waiting in</p>
              <ul>
                {info.places.map(({ base, count }) => (
                  <li key={base.id}>
                    <Icon name="pin" size={15} />
                    <span>{base.name}</span>
                    <em>
                      {count} {count === 1 ? 'Jeep' : 'Jeeps'}
                    </em>
                  </li>
                ))}
              </ul>
            </div>
            <p className="showroom__price">
              from <strong>${info.from}</strong> a day
            </p>
            <button type="button" className="btn btn--book showroom__go" onClick={build}>
              Build this one
            </button>
            <p className="showroom__note">
              Opens the builder in {baseById((info.jeeps.find((v) => v.roof === roof && v.base === s.base) ?? info.jeeps.find((v) => v.roof === roof) ?? info.jeeps[0]).base).name}.
            </p>
          </div>
        </div>

        <ul className="lineup" role="radiogroup" aria-label="Paint" data-reveal style={{ '--d': '0.25s' } as CSSProperties}>
          {paintOrder.map((p) => {
            const st = stats(p)
            return (
              <li key={p}>
                <button type="button" role="radio" aria-checked={p === paint} className="lineup__car" onClick={() => setPaint(p)} style={{ '--c': paints[p].hex } as CSSProperties}>
                  <Still paint={p} roof={p === paint ? roof : st.roofs[0]} eager={seen} className="lineup__still" />
                  <span className="lineup__name">
                    <i aria-hidden="true" />
                    {paints[p].name}
                  </span>
                  <span className="lineup__count">{st.jeeps.length} in the fleet</span>
                </button>
              </li>
            )
          })}
        </ul>

        <ul className="specs" data-reveal style={{ '--d': '0.3s' } as CSSProperties}>
          <li>
            <Icon name="calendar" size={22} />
            <strong>2025 and 2026 models</strong>
            <span>Nothing older on the road.</span>
          </li>
          <li>
            <Icon name="axle" size={22} />
            <strong>Rubicon 4x4</strong>
            <span>Rock-Trac four-wheel drive with locking front and rear differentials.</span>
          </li>
          <li>
            <Icon name="seat" size={22} />
            <strong>Leather, low miles</strong>
            <span>Seats {SEATS}, with room behind for beach bags.</span>
          </li>
          <li>
            <Icon name="sun" size={22} />
            <strong>Roof back in seconds</strong>
            <span>Power sky roof on most, colour-matched hardtop on the rest.</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
