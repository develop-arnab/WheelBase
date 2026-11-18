import { site } from '../config/site'
import { bases, type BaseId } from '../data/places'
import { scrollToBuilder } from '../lib/scroll'
import { useTrip } from '../lib/trip'
import { Wordmark } from './Header'
import './Footer.css'

export function Footer() {
  const { dispatch } = useTrip()
  const start = (base: BaseId) => {
    dispatch({ type: 'base', base })
    dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            <Wordmark />
            <p>{site.tagline}</p>
          </div>
          <div className="footer__cols">
            <nav aria-label="Footer">
              <p className="footer__head">Explore</p>
              <ul>
                <li>
                  <a href="#build">Build your trip</a>
                </li>
                {site.nav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href}>{n.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="footer__head">Start a trip in</p>
              <ul>
                {bases.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => start(b.id)}>
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="footer__head">Booking</p>
              <ul className="footer__plain">
                <li>Reserve online, confirmed by email</li>
                <li>Bookings run on Wheelbase</li>
                <li>{site.region}</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="footer__legal">
          <span>
            © {new Date().getFullYear()} {site.legalName}
          </span>
          <span>{site.name}</span>
        </p>
      </div>
    </footer>
  )
}
