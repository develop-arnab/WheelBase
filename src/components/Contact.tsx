import { useEffect, useState, type FormEvent } from 'react'
import './Contact.css'

/*
  The quote request the current site already offers, kept to the same four
  fields. Sending is wired up in Phase 3; until then the form says so rather
  than pretending. A trip sent from the builder lands in the message.
*/
export function Contact() {
  const [message, setMessage] = useState('')
  const [first, setFirst] = useState('')
  const [done, setDone] = useState(false)

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
    <section className="contact band" id="contact">
      <div className="wrap contact__grid">
        <div className="contact__copy">
          <h2 className="h2">Tell us about your trip.</h2>
          <p className="lede">Questions, a longer stay, or something the builder doesn’t cover? Tell us and we’ll come back with a plan that fits.</p>
          <p className="contact__alt">
            Already know what you want? <a href="#build">Build your trip</a>
          </p>
        </div>

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
            <label className="field field--wide">
              <span>Your trip</span>
              <textarea name="message" rows={6} required placeholder="Dates, where you’re staying, how many of you" value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button className="btn btn--ink" type="submit">Request a quote</button>
          </form>
        )}
      </div>
    </section>
  )
}
