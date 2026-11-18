import { site } from '../config/site'
import { bases } from '../data/places'
import { Wordmark } from './Header'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__cols">
          <div className="footer__brand">
            <Wordmark />
            <p>{site.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <p className="footer__head">Explore</p>
            <ul>
              {site.nav.map((n) => (
                <li key={n.href}><a href={n.href}>{n.label}</a></li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="footer__head">Pick up in</p>
            <ul>
              {bases.map((b) => <li key={b.id}>{b.name}</li>)}
            </ul>
          </div>
        </div>
        <p className="footer__legal">© {new Date().getFullYear()} {site.legalName}. Bookings run on Wheelbase.</p>
      </div>
    </footer>
  )
}
