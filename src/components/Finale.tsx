import type { CSSProperties } from 'react'
import { paints } from '../data/fleet'
import { useInView } from '../lib/reveal'
import { scrollToBuilder } from '../lib/scroll'
import { useStill } from '../lib/stills'
import { useTrip } from '../lib/trip'
import { Scenery } from './Hero'
import { Jeep } from './Jeep'
import './Finale.css'

/*
  The last thing on the page: the same beach as the first screen, the Jeep
  parked on it side-on, and the line from the client's own site.
*/
export function Finale() {
  const { s, dispatch } = useTrip()
  const [ref, seen] = useInView<HTMLElement>('0px 0px 30% 0px')
  const url = useStill({ paint: paints.red.hex, roof: 'sky', angle: 'side' }, seen)
  const start = () => {
    if (s.step === 0) dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }
  return (
    <section className="finale" ref={ref} data-shown={seen || undefined} aria-labelledby="finale-title" style={{ '--horizon': '54%' } as CSSProperties}>
      <Scenery />
      <div className="wrap finale__inner">
        <h2 className="finale__title display" id="finale-title" data-reveal>
          Sun, sand, and amazing summer memories.
        </h2>
        <p className="finale__lede" data-reveal style={{ '--d': '0.1s' } as CSSProperties}>
          Pick the place, the dates and the colour. The roof comes off when you get there.
        </p>
        <button type="button" className="btn btn--book finale__go" onClick={start} data-reveal style={{ '--d': '0.18s' } as CSSProperties}>
          {s.step === 0 ? 'Build your trip' : 'Back to your trip'}
        </button>
      </div>
      <div className="finale__jeep" aria-hidden="true">
        {url ? <img src={url} alt="" /> : <Jeep paint={paints.red.hex} />}
      </div>
    </section>
  )
}
