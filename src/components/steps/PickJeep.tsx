import { paintOrder, paints, roofs, type Roof } from '../../data/fleet'
import { formatRange, offsetFromToday } from '../../lib/dates'
import { availability, usd, useTrip } from '../../lib/trip'
import { DateRange } from '../DateRange'
import { Icon } from '../Icon'
import { PlacePicker } from '../PlacePicker'

export function PickJeep() {
  const { s, d, dispatch } = useTrip()
  const v = d.vehicle
  const paintsHere = paintOrder.filter((p) => d.here.some((x) => x.paint === p))
  const roofFor = (r: Roof) => d.here.some((x) => x.paint === s.paint && x.roof === r)
  const booked = (iso: string) => {
    const o = offsetFromToday(iso)
    return v.booked.some(([a, b]) => o >= a && o <= b)
  }
  const roofHint = (r: Roof) => {
    const names = [...new Set(d.here.filter((x) => x.roof === r).map((x) => paints[x.paint].name.split(' ').pop()!.toLowerCase()))]
    if (!names.length) return `Not in ${d.base.name}`
    return `Comes in ${names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0]} here`
  }
  const swatchBooked = (p: string) => {
    const xs = d.here.filter((x) => x.paint === p)
    return xs.length > 0 && xs.every((x) => availability(x, s.from, s.to).state === 'booked')
  }

  return (
    <div className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Choose your Jeep</h2>
        <p className="panel__lede">Pick a paint and a roof. Each combination is a real Jeep waiting in {d.base.name}.</p>
      </header>

      <section className="sec">
        <h3 className="sec__label">Your trip</h3>
        <div className="fieldset">
          <PlacePicker value={s.base} onChange={(b) => dispatch({ type: 'base', base: b })} />
          <DateRange
            from={s.from}
            to={s.to}
            onChange={(f, t) => dispatch({ type: 'dates', from: f, to: t })}
            isBooked={booked}
            bookedLabel={`${v.name} is out on these days`}
          />
        </div>
      </section>

      <section className="sec">
        <h3 className="sec__label">Paint <span>{paints[s.paint].name}</span></h3>
        <div className="swatches" role="group" aria-label="Paint">
          {paintsHere.map((p) => (
            <button
              key={p}
              className="swatch"
              style={{ ['--c' as string]: paints[p].hex }}
              aria-pressed={s.paint === p}
              aria-label={`${paints[p].name}${swatchBooked(p) ? ', booked on your dates' : ''}`}
              title={paints[p].name}
              data-booked={swatchBooked(p) || undefined}
              onClick={() => dispatch({ type: 'paint', paint: p })}
            />
          ))}
        </div>
      </section>

      <section className="sec">
        <h3 className="sec__label">Roof</h3>
        <div className="segmented" role="group" aria-label="Roof">
          {(['sky', 'hardtop'] as Roof[]).map((r) => (
            <button key={r} aria-pressed={s.roof === r} disabled={!d.here.some((x) => x.roof === r)} onClick={() => dispatch({ type: 'roof', roof: r })}>
              <Icon name={r === 'sky' ? 'roof' : 'front'} size={20} />
              <strong>{roofs[r].name}</strong>
              <span>{roofFor(r) ? roofs[r].line : roofHint(r)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="sec">
        <h3 className="sec__label">Availability</h3>
        <div className="avail">
          <p className="avail__row">
            <span><strong>{v.name}</strong> <em className="chart-voice">{v.line}</em></span>
            <b>{usd(v.dayRate)}<small> a day</small></b>
          </p>
          <Status />
        </div>
      </section>

      <section className="sec">
        <h3 className="sec__label">All Jeeps in {d.base.name}</h3>
        <ul className="fleetlist">
          {d.here.map((x) => {
            const a = availability(x, s.from, s.to)
            return (
              <li key={x.id}>
                <button aria-pressed={x.id === v.id} onClick={() => dispatch({ type: 'vehicle', vehicle: x })}>
                  <i style={{ background: paints[x.paint].hex }} />
                  <strong>{x.name}</strong>
                  <span>{roofs[x.roof].name}</span>
                  <em data-state={a.state}>{a.state === 'free' ? 'Free' : a.state === 'booked' ? 'Booked' : usd(x.dayRate)}</em>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export function Status() {
  const { s, d, dispatch } = useTrip()
  const v = d.vehicle
  if (d.avail.state === 'no-dates')
    return <p className="status status--idle"><Icon name="calendar" size={18} /> Add your dates to check {v.name} is free.</p>
  if (d.avail.state === 'free')
    return <p className="status status--free"><Icon name="check" size={18} /> Free for {formatRange(s.from!, s.to!)}</p>
  return (
    <div className="status status--booked">
      <p><Icon name="x" size={18} /> {v.name} is out on some of those days.</p>
      {d.alternatives.length > 0 ? (
        <div className="status__alts">
          {d.alternatives.slice(0, 3).map((x) => (
            <button key={x.id} className="chip" onClick={() => dispatch({ type: 'vehicle', vehicle: x })}>
              <i style={{ background: paints[x.paint].hex }} /> {x.name} is free
            </button>
          ))}
        </div>
      ) : (
        <p className="status__note">Nothing else in {d.base.name} is free then. Try other dates.</p>
      )}
    </div>
  )
}
