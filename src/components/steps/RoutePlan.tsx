import { spotById, spots, islandName } from '../../data/places'
import { nodes } from '../../data/roads'
import { bestOrder, formatMinutes } from '../../lib/route'
import { useTrip } from '../../lib/trip'
import { Icon } from '../Icon'

const islandOf = new Map(nodes.map((n) => [n.id, n.island]))

export function RoutePlan({ focus, onFocus }: { focus: string | null; onFocus: (id: string | null) => void }) {
  const { s, d, dispatch } = useTrip()
  const home = d.base.island
  const local = spots.filter((x) => x.island === home)
  const away = spots.filter((x) => x.island !== home)
  const best = bestOrder(d.base.node, s.stops.map((id) => spotById(id).node))
  const noteId = focus ?? s.stops[s.stops.length - 1] ?? null
  const note = noteId ? spotById(noteId) : null
  const startName = d.base.where.split(',')[0]

  return (
    <div className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Plan the route</h2>
        <p className="panel__lede">Tap places on the map or below. We plot the roads and ferries between them, and bring you back to the start.</p>
      </header>
      {s.notice && <p className="notice" role="status">{s.notice}</p>}

      <ol className="itinerary">
        <li className="itinerary__start">
          <span className="itinerary__dot"><Icon name="pin" size={14} /></span>
          <span className="itinerary__name">{startName}</span>
          <span className="itinerary__leg">Pick-up</span>
        </li>
        {s.stops.map((id, i) => {
          const leg = d.legs[i]
          const spot = spotById(id)
          return (
            <li key={id} onPointerEnter={() => onFocus(id)} onPointerLeave={() => onFocus(null)}>
              <span className="itinerary__dot is-on">{i + 1}</span>
              <span className="itinerary__name">{spot.name}</span>
              {leg && (
                <span className="itinerary__leg">
                  {Math.round(leg.miles)} mi · {formatMinutes(leg.minutes)}
                  {leg.ferries.length > 0 && <b className="tag tag--ferry"><Icon name="ferry" size={13} /> Car ferry</b>}
                  {leg.sand && <b className="tag tag--sand"><Icon name="sand" size={13} /> Permit</b>}
                </span>
              )}
              <button className="itinerary__drop" onClick={() => dispatch({ type: 'stop', id })} aria-label={`Remove ${spot.name}`}>
                <Icon name="x" size={14} />
              </button>
            </li>
          )
        })}
        {s.stops.length > 0 && d.legs.length > 0 && (
          <li className="itinerary__back">
            <span className="itinerary__dot"><Icon name="arrowLeft" size={14} /></span>
            <span className="itinerary__name">Back to {startName}</span>
            <span className="itinerary__leg">
              {Math.round(d.legs[d.legs.length - 1].miles)} mi · {formatMinutes(d.legs[d.legs.length - 1].minutes)}
              {d.legs[d.legs.length - 1].ferries.length > 0 && <b className="tag tag--ferry"><Icon name="ferry" size={13} /> Car ferry</b>}
            </span>
          </li>
        )}
      </ol>

      {s.stops.length > 0 ? (
        <div className="tally">
          <div><strong>{Math.round(d.miles)}</strong><span>miles</span></div>
          <div><strong>{formatMinutes(d.minutes)}</strong><span>behind the wheel</span></div>
          <div><strong>{d.daysNeeded}</strong><span>{d.daysNeeded === 1 ? 'day to see it' : 'days to see it'}</span></div>
        </div>
      ) : (
        <p className="panel__foot">Nothing plotted yet. Start with somewhere on {islandName[home]}.</p>
      )}
      {d.days > 0 && d.daysNeeded > d.days && (
        <p className="notice">That’s more than your {d.days} {d.days === 1 ? 'day' : 'days'} with the Jeep. Drop a stop, or add a day.</p>
      )}
      {d.ferries.length > 0 && (
        <p className="notice notice--soft"><Icon name="ferry" size={16} /> Taking the Jeep on a car ferry needs a reservation with the Steamship Authority. Summer spots go early.</p>
      )}
      {d.sand && (
        <p className="notice notice--soft"><Icon name="sand" size={16} /> Sand tracks need an over-sand permit. Ask us and we’ll sort it with the Jeep.</p>
      )}
      {best && (
        <button className="btn btn--ghost btn--small reorder" onClick={() => dispatch({ type: 'stops', stops: best.order.map((i) => s.stops[i]) })}>
          <Icon name="shuffle" size={16} /> Reorder to save {formatMinutes(best.savedMinutes)}
        </button>
      )}

      <section className="sec">
        <h3 className="sec__label">On {islandName[home]}</h3>
        <div className="spotchips">
          {local.map((x) => (
            <button key={x.id} className="spotchip" aria-pressed={s.stops.includes(x.id)} onClick={() => dispatch({ type: 'stop', id: x.id })} onPointerEnter={() => onFocus(x.id)} onPointerLeave={() => onFocus(null)}>
              <Icon name={x.kind} size={16} /> {x.name}
            </button>
          ))}
        </div>
      </section>

      <details className="away">
        <summary>Over the water</summary>
        <div className="spotchips">
          {away.map((x) => (
            <button key={x.id} className="spotchip" aria-pressed={s.stops.includes(x.id)} onClick={() => dispatch({ type: 'stop', id: x.id })} onPointerEnter={() => onFocus(x.id)} onPointerLeave={() => onFocus(null)}>
              <Icon name={x.kind} size={16} /> {x.name} <small>{islandName[islandOf.get(x.node)!]}</small>
            </button>
          ))}
        </div>
      </details>

      <div className="placenote" aria-live="polite">
        {note ? (
          <p key={note.id}><strong>{note.name}.</strong> <span className="chart-voice">{note.note}</span></p>
        ) : (
          <p className="chart-voice">Point at a place to read about it.</p>
        )}
      </div>
    </div>
  )
}
