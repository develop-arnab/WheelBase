import { useState, type CSSProperties } from 'react'
import { site } from '../config/site'
import { useInView } from '../lib/reveal'
import { Icon, type IconName } from './Icon'
import { Jeep } from './Jeep'
import './Info.css'

/*
  How it works, drawn as the drive it describes: three stops on one road,
  and a small Jeep that makes the trip once when the section arrives.
  Then who runs it, set like a page from a logbook.
*/

const steps: { icon: IconName; title: string; body: string }[] = [
  { icon: 'calendar', title: 'Build it, reserve it', body: 'Choose the Jeep, the kit and the route above, then reserve. A confirmation email follows with everything you chose.' },
  { icon: 'ferry', title: 'Tell us how you’re arriving', body: 'Ferry, flight or front door. We line the handover up with it, so the Jeep is waiting when you are.' },
  { icon: 'key', title: 'Roof back, bags in', body: 'A quick walk-round, a few local tips, and the keys are yours until the day you leave.' },
]

export function HowItWorks() {
  const [ref, seen] = useInView<HTMLElement>()
  const [arrived, setArrived] = useState(false)
  return (
    <section className="journey sect sect--sand" id="how" ref={ref} data-shown={seen || undefined} aria-labelledby="how-title">
      <svg className="shore" viewBox="0 0 1440 34" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H1440V12C1300 22 1180 8 1040 14S780 30 640 20 380 6 240 14 60 26 0 18Z" fill="#e3edf4" />
        <path d="M0 18C60 26 140 20 240 14S500 30 640 20 900 8 1040 14 1300 22 1440 12" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.9" />
      </svg>
      <div className="wrap">
        <header className="shead">
          <h2 className="shead__title" id="how-title" data-reveal>
            From booking to beach.
          </h2>
          <p className="shead__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
            Three stops between this page and the sand, and we handle most of the second one.
          </p>
        </header>

        <div className="road" data-reveal style={{ '--d': '0.15s' } as CSSProperties}>
          <div className="road__track" aria-hidden="true">
            <span className="road__line" />
            <span className="road__jeep" onAnimationEnd={() => setArrived(true)}>
              <Jeep paint="#c2413b" roof="open" driving={seen && !arrived} />
            </span>
          </div>
          <ol className="road__stops">
            {steps.map((st, i) => (
              <li key={st.title} style={{ '--i': i } as CSSProperties}>
                <span className="road__mark">
                  <Icon name={st.icon} size={22} />
                </span>
                <h3 className="road__title">{st.title}</h3>
                <p>{st.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

const standards = [
  '2025 and 2026 Rubicons only',
  'Premium leather and low miles',
  'Maintained to a standard a rental desk doesn’t attempt',
  'Set up for the Cape and Islands, sand tracks included',
  'Local advice from people who live here',
]

export function About() {
  const [ref, seen] = useInView<HTMLElement>()
  return (
    <section className="about sect sect--paper" id="about" ref={ref} data-shown={seen || undefined} aria-labelledby="about-title">
      <div className="wrap about__grid">
        <div className="about__copy">
          <h2 className="shead__title" id="about-title" data-reveal>
            Car people, with sand in the floor mats.
          </h2>
          <p className="shead__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
            {site.name} was founded by automotive industry veterans with decades in the car world. It shows in how the fleet is kept.
          </p>
          <p className="about__body" data-reveal style={{ '--d': '0.15s' } as CSSProperties}>
            Every Rubicon is maintained to a standard a rental desk doesn’t attempt, and set up for the Cape and Islands. Our roots here run deep, so ask us anything.
          </p>
        </div>

        <aside className="log" data-reveal style={{ '--d': '0.2s' } as CSSProperties} aria-label="Our standard">
          <p className="log__head">
            <span>Every Rubicon</span>
            <span className="chart-voice">{site.region}</span>
          </p>
          <ul>
            {standards.map((t) => (
              <li key={t}>
                <Icon name="check" size={18} />
                {t}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="wrap">
        <blockquote className="about__quote chart-voice" data-reveal style={{ '--d': '0.25s' } as CSSProperties}>
          Ask us where to watch the sun drop into the Atlantic, or which sandy track is worth the detour.
        </blockquote>
      </div>
    </section>
  )
}
