import { site } from '../config/site'
import { Icon } from './Icon'
import './Info.css'

/* The quiet half of the page: how pickup works and who runs it. No motion. */

const steps = [
  { title: 'Reserve online', body: 'Build your trip above and reserve it. You get a confirmation email with everything you chose.' },
  { title: 'Tell us how you’re arriving', body: 'Ferry, flight or front door. We line the handover up with it, so the Jeep is waiting when you are.' },
  { title: 'Roof back, bags in', body: 'A quick walk-round, a few local tips, and the keys are yours until the day you leave.' },
]

export function HowItWorks() {
  return (
    <section className="info band" id="how">
      <div className="wrap">
        <h2 className="h2 info__title">From booking to beach</h2>
        <ol className="how">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="how__n display">{i + 1}</span>
              <h3 className="h3">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function About() {
  return (
    <section className="info info--about band" id="about">
      <div className="wrap about">
        <div className="about__copy">
          <h2 className="h2">Car people, with sand in the floor mats.</h2>
          <p className="lede">
            {site.name} was founded by automotive industry veterans with decades in the car world. It shows in how the fleet is kept.
          </p>
          <p>
            Every Rubicon is maintained to a standard a rental desk doesn’t attempt, and set up for the Cape and Islands. Our roots here run deep, so ask us anything: where to watch the sun drop into the Atlantic, or which sandy track is worth the detour.
          </p>
        </div>
        <dl className="about__sheet">
          <div><dt><Icon name="roof" size={18} /> The fleet</dt><dd>Jeep Wrangler Rubicon, 2025 and 2026 models</dd></div>
          <div><dt><Icon name="seat" size={18} /> Inside</dt><dd>Premium leather, low miles, power sky roof on most</dd></div>
          <div><dt><Icon name="pin" size={18} /> Where</dt><dd>{site.region}</dd></div>
        </dl>
      </div>
    </section>
  )
}
