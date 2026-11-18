import { islets } from '../data/coast'
import { fleetAt } from '../data/fleet'
import { bases, spots, type Base } from '../data/places'
import { coast, fit, nodeXY, regionBox, roadPaths } from '../lib/chart'
import { project } from '../lib/geo'
import { useTrip } from '../lib/trip'
import { scrollToBuilder } from '../lib/scroll'
import { Icon } from './Icon'
import './Places.css'

/*
  The four pick-up points, each as a crop of the same chart the route is
  planned on. Choosing one starts the builder there.
*/

const ASPECT = 4 / 3

function Crop({ base }: { base: Base }) {
  const box = fit(regionBox(base.island, base.id), ASPECT, base.id === 'boston' ? 0.12 : 0.04)
  const here = spots.filter((s) => s.island === base.island)
  const [bx, by] = nodeXY.get(base.node)!
  const u = box.w / 100 // one hundredth of the crop, for sizes that read the same on every card
  return (
    <svg className="crop" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden="true">
      <rect x={box.x} y={box.y} width={box.w} height={box.h} className="crop__sea" />
      <g className="crop__shoal">
        {coast.map((d, i) => <path key={i} d={d} strokeWidth={u * 5} />)}
      </g>
      <g className="crop__land">
        {coast.map((d, i) => <path key={i} d={d} />)}
        {islets.map(([lat, lon, rx, ry, rot], i) => {
          const [x, y] = project(lat, lon)
          return <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />
        })}
      </g>
      <g className="crop__roads">
        {roadPaths.filter((r) => r.kind !== 'ferry').map((r, i) => <path key={i} d={r.d} data-kind={r.kind} />)}
        {roadPaths.filter((r) => r.kind === 'ferry').map((r, i) => <path key={`f${i}`} d={r.d} data-kind="ferry" />)}
      </g>
      <g className="crop__spots">
        {here.map((s) => {
          const [x, y] = nodeXY.get(s.node)!
          return (
            <circle key={s.id} cx={x} cy={y} r={u * 1.6} />
          )
        })}
      </g>
      <g className="crop__base">
        <circle cx={bx} cy={by} r={u * 5} className="crop__halo" />
        <circle cx={bx} cy={by} r={u * 2.4} />
      </g>
    </svg>
  )
}

export function Places() {
  const { s, dispatch } = useTrip()
  const start = (b: Base) => {
    dispatch({ type: 'base', base: b.id })
    dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }
  return (
    <section className="places band" id="places" aria-labelledby="places-title">
      <div className="wrap">
        <header className="places__head">
          <h2 className="h2" id="places-title">Four places to pick up the keys</h2>
          <p className="lede">Meet your Jeep off the ferry on either island, in Hyannis, or near Logan. The route planner knows the roads, the ferries and the sand from each one.</p>
        </header>
        <ul className="places__grid">
          {bases.map((b) => {
            const jeeps = fleetAt(b.id)
            const from = Math.min(...jeeps.map((v) => v.dayRate))
            const here = spots.filter((p) => p.island === b.island)
            const chosen = s.base === b.id && s.step > 0
            return (
              <li key={b.id} className="place" data-chosen={chosen || undefined}>
                <button className="place__btn" onClick={() => start(b)} aria-label={`Start a trip in ${b.name}`}>
                  <span className="place__map">
                    <Crop base={b} />
                  </span>
                  <span className="place__body">
                    <span className="place__name display">{b.name}</span>
                    <span className="place__where">
                      <Icon name="pin" size={15} /> {b.where}
                    </span>
                    <span className="place__spots">{here.map((p) => p.name).join(', ')}</span>
                    <span className="place__foot">
                      <span>
                        {jeeps.length} Jeeps, from <strong>${from}</strong> a day
                      </span>
                      <span className="place__go">
                        {chosen ? 'Your pick-up' : `Start in ${b.short}`}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
