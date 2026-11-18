import { useState } from 'react'
import { extraById } from '../../data/extras'
import { MODEL, roofs } from '../../data/fleet'
import { spotById } from '../../data/places'
import { formatLong, formatShort } from '../../lib/dates'
import { formatMinutes } from '../../lib/route'
import { encodeTrip, usd, useTrip } from '../../lib/trip'
import { Icon } from '../Icon'
import { Status } from './PickJeep'

const INKS = ['#c2413b', '#2e47a8', '#3d5c32', '#8a5a1f']

export function sendTripToTeam(text: string) {
  window.dispatchEvent(new CustomEvent('pjr:trip-note', { detail: text }))
  window.setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 60)
}

export function tripSummary(s: ReturnType<typeof useTrip>['s'], d: ReturnType<typeof useTrip>['d']) {
  const lines = [
    `Trip request: ${d.vehicle.name} (${d.paint.name}, ${roofs[s.roof].name.toLowerCase()}) from ${d.base.where}.`,
    s.from && s.to ? `Dates: ${formatLong(s.from)} to ${formatLong(s.to)}.` : 'Dates: not chosen yet.',
    s.extras.length ? `Kit: ${s.extras.map((id) => extraById(id).name).join(', ')}.` : null,
    s.stops.length ? `Route: ${s.stops.map((id) => spotById(id).name).join(', ')}.` : null,
  ]
  return lines.filter(Boolean).join('\n')
}

export function Pass() {
  const { s, d } = useTrip()
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')
  const link = `${window.location.origin}${window.location.pathname}?trip=${encodeTrip(s)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }

  return (
    <div className="panel">
      <header className="panel__head">
        <h2 className="panel__title">Your trip pass</h2>
        <p className="panel__lede">Everything you chose, in one place. Reserve it, share it, or ask us about it.</p>
      </header>
      <article className="pass">
        <header className="pass__head">
          <div>
            <p className="pass__kicker">Trip pass</p>
            <p className="pass__name display">{d.vehicle.name}</p>
            <p className="pass__meta">{d.vehicle.year} {MODEL}</p>
          </div>
          <span className="pass__paint" style={{ background: d.paint.hex }} title={d.paint.name} />
        </header>
        <dl className="pass__rows">
          <div><dt>Pick-up</dt><dd>{s.from ? formatLong(s.from) : 'Add your dates'}<small>{d.base.where}</small></dd></div>
          <div><dt>Return</dt><dd>{s.to ? formatLong(s.to) : 'Add your dates'}<small>Same place</small></dd></div>
          <div><dt>Jeep</dt><dd>{d.paint.name}, {roofs[s.roof].name.toLowerCase()}</dd></div>
          <div><dt>Kit</dt><dd>{s.extras.length ? s.extras.map((id) => extraById(id).name).join(', ') : 'None'}</dd></div>
          <div>
            <dt>Route</dt>
            <dd>
              {s.stops.length ? (
                <>
                  <span className="stamps">
                    {s.stops.map((id, i) => {
                      const sp = spotById(id)
                      return (
                        <span key={id} className="stamp" style={{ ['--ink' as string]: INKS[i % INKS.length], ['--r' as string]: `${((i * 37) % 21) - 10}deg`, ['--i' as string]: i }} title={sp.name}>
                          <Icon name={sp.kind} size={18} />
                          <small>{sp.name}</small>
                        </span>
                      )
                    })}
                  </span>
                  <span className="pass__route">{Math.round(d.miles)} miles, about {formatMinutes(d.minutes)} of driving</span>
                </>
              ) : (
                'Not planned. That’s allowed.'
              )}
            </dd>
          </div>
        </dl>
        <div className="pass__tear" aria-hidden="true" />
        <dl className="pass__sum">
          {d.days > 0 ? (
            <>
              <div><dt>{d.vehicle.name}, {d.days} {d.days === 1 ? 'day' : 'days'} × {usd(d.vehicle.dayRate)}</dt><dd>{usd(d.jeepCost)}</dd></div>
              {d.kitPerDay > 0 && <div><dt>Kit, {d.days} × {usd(d.kitPerDay)}</dt><dd>{usd(d.kitCost)}</dd></div>}
              <div className="pass__total"><dt>Estimated total</dt><dd>{usd(d.total)}</dd></div>
              <p className="pass__fine">Sample rates. Taxes, fees and deposit are confirmed at checkout.</p>
            </>
          ) : (
            <div className="pass__total"><dt>{usd(d.vehicle.dayRate + d.kitPerDay)} a day</dt><dd /></div>
          )}
        </dl>
      </article>

      <Status />

      <div className="pass__actions">
        <button className="btn btn--ghost btn--small" onClick={copy}>
          <Icon name={copied === 'done' ? 'check' : 'link'} size={16} /> {copied === 'done' ? 'Link copied' : 'Copy trip link'}
        </button>
        <button className="btn btn--ghost btn--small" onClick={() => sendTripToTeam(tripSummary(s, d))}>
          Ask us about this trip
        </button>
      </div>
      {copied === 'failed' && (
        <label className="copybox">
          <span>Copy this link:</span>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
      <p className="panel__foot">{s.from && s.to ? `Pick-up ${formatShort(s.from)}, back ${formatShort(s.to)}.` : ''}</p>
    </div>
  )
}
