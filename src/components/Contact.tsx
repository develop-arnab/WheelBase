import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { paints } from '../data/fleet'
import { bases, type BaseId } from '../data/places'
import { useInView } from '../lib/reveal'
import { useStill } from '../lib/stills'
import { Jeep } from './Jeep'
import './Contact.css'

const GROUPS = ['Just us two', '3 or 4 of us', 'More than 4'] as const

/** The stamp in the corner of the card: the red Jeep, side on */
function Stamp() {
  const url = useStill({ paint: paints.red.hex, roof: 'sky', angle: 'side' })
  return (
    <span className="stamp" aria-hidden="true">
      <span className="stamp__inner">
        {url ? <img src={url} alt="" /> : <Jeep paint={paints.red.hex} />}
        <span className="stamp__text chart-voice">Cape &amp; Islands</span>
      </span>
    </span>
  )
}

/*
  The quote request the current site already offers, kept to the same four
  fields. Sending is wired up in Phase 3; until then the form says so rather
  than pretending. A trip sent from the builder lands in the message.
*/
export function Contact() {
  const [message, setMessage] = useState('')
  const [first, setFirst] = useState('')
  const [done, setDone] = useState(false)
  const [where, setWhere] = useState<BaseId | null>(null)
  const [group, setGroup] = useState<(typeof GROUPS)[number] | null>(null)
  const [ref, seen] = useInView<HTMLElement>()

  useEffect(() => {
    const on = (e: Event) => {
      const note = (e as CustomEvent<string>).detail
      setDone(false)
      setMessage((m) => {
        const mine = m.split('\n\n').filter((p) => !p.startsWith('Trip request:')).join('\n\n').trim()
        return mine ? `${note}\n\n${mine}` : `${note}\n\n`
      })
    }
    window.addEventListener('pjr:trip-note', on)
    return () => window.removeEventListener('pjr:trip-note', on)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setDone(true)
  }

  return (
    <section className="contact sect sect--sea" id="contact" ref={ref} data-shown={seen || undefined} aria-labelledby="contact-title">
      <div className="wrap contact__grid">
        <div className="contact__copy">
          <h2 className="shead__title" id="contact-title" data-reveal>
            Plan it with us.
          </h2>
          <p className="shead__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
            Questions, a longer stay, or something the builder doesn’t cover? Tell us about the trip and we’ll come back with a plan that fits.
          </p>
          <p className="contact__alt" data-reveal style={{ '--d': '0.15s' } as CSSProperties}>
            Already know what you want? <a href="#build">Build your trip</a>
          </p>
        </div>

        <div className="postcard" data-reveal style={{ '--d': '0.2s' } as CSSProperties}>
          <Stamp />
          {done ? (
            <div className="contact__done" role="status">
              <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
                <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path d="m14 25 7 7 14-15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="h3">Thanks{first ? `, ${first}` : ''}. Your request is ready.</p>
              <p>This preview doesn’t send messages yet. The form is connected to the team’s inbox in the next phase.</p>
              <button className="btn btn--ghost btn--small" onClick={() => setDone(false)}>Edit the request</button>
            </div>
          ) : (
            <form className="contact__form" onSubmit={submit}>
              <p className="postcard__to chart-voice">To the Premium Jeep Rentals team</p>
              <label className="field">
                <span>First name</span>
                <input name="first" autoComplete="given-name" required value={first} onChange={(e) => setFirst(e.target.value)} />
              </label>
              <label className="field">
                <span>Last name</span>
                <input name="last" autoComplete="family-name" required />
              </label>
              <label className="field field--wide">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <fieldset className="choice field--wide">
                <legend>Where would you like it?</legend>
                <div>
                  {bases.map((b) => (
                    <button key={b.id} type="button" aria-pressed={where === b.id} onClick={() => setWhere(where === b.id ? null : b.id)}>
                      {b.short}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="choice field--wide">
                <legend>How many of you?</legend>
                <div>
                  {GROUPS.map((g) => (
                    <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(group === g ? null : g)}>
                      {g}
                    </button>
                  ))}
                </div>
              </fieldset>
              <input type="hidden" name="where" value={where ?? ''} />
              <input type="hidden" name="group" value={group ?? ''} />
              <label className="field field--wide">
                <span>Your trip</span>
                <textarea name="message" rows={5} required placeholder="Dates, where you’re staying, anything we should know" value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <button className="btn btn--ink contact__send" type="submit">Send the request</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
