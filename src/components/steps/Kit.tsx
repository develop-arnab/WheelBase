import { extras, type Extra } from '../../data/extras'
import { usd, useTrip } from '../../lib/trip'
import { Icon } from '../Icon'

const GROUPS: { label: string; ids: Extra['id'][]; note?: string }[] = [
  { label: 'Up top', ids: ['surf', 'kayak', 'traction'], note: 'Surfboards and the kayak share the rack. The rack comes free.' },
  { label: 'On the back', ids: ['cooler'] },
  { label: 'Inside', ids: ['child-seat'] },
]

export function Kit() {
  const { s, d, dispatch } = useTrip()
  const sky = s.roof === 'sky'
  return (
    <div className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Kit it out</h2>
        <p className="panel__lede">Everything here is fitted before you pick up. Add something and watch it go on.</p>
      </header>

      <section className="sec">
        <h3 className="sec__label">Roof</h3>
        <div className="roofrow">
          <div>
            <strong>{sky ? 'Power sky roof' : 'Hardtop panels'}</strong>
            <span>{sky ? 'One button, about 20 seconds. Try it.' : 'The panels over the front seats lift off by hand.'}</span>
          </div>
          <button className="switch" role="switch" aria-checked={s.roofOpen} onClick={() => dispatch({ type: 'roofOpen', open: !s.roofOpen })}>
            <span className="switch__track"><span className="switch__thumb" /></span>
            {s.roofOpen ? 'Open' : 'Closed'}
          </button>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section className="sec" key={g.label}>
          <h3 className="sec__label">{g.label}</h3>
          <ul className="kitlist">
            {g.ids.map((id) => {
              const e = extras.find((x) => x.id === id)!
              const on = s.extras.includes(e.id)
              const swaps = e.slot && !on && s.extras.some((x) => extras.find((y) => y.id === x)?.slot === e.slot)
              return (
                <li key={e.id}>
                  <button className="kit" aria-pressed={on} onClick={() => dispatch({ type: 'extra', id: e.id })}>
                    <span className="kit__icon"><Icon name={e.icon} size={22} /></span>
                    <span className="kit__text">
                      <strong>{e.name}</strong>
                      <span>{swaps ? 'Swaps out what’s on the rack' : e.line}</span>
                    </span>
                    <span className="kit__price">{usd(e.perDay)}<small>a day</small></span>
                    <span className="kit__check" aria-hidden="true"><Icon name={on ? 'check' : 'plus'} size={16} /></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {g.note && <p className="sec__note">{g.note}</p>}
        </section>
      ))}

      <p className="panel__foot">
        {s.extras.length ? <>Kit comes to <strong>{usd(d.kitPerDay)} a day</strong>.</> : 'No kit yet. All of it is optional.'}
      </p>
    </div>
  )
}
