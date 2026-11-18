import { useEffect, useState } from 'react'
import { site } from '../config/site'
import { useTrip } from '../lib/trip'
import { scrollToBuilder } from '../lib/scroll'
import './Header.css'

export function Wordmark() {
  return (
    <span className="wordmark">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 3.5 19 16l-3 12.5L13 16Z" fill="currentColor" />
        <path d="M3.5 16 16 13l12.5 3L16 19Z" fill="var(--red)" />
        <circle cx="16" cy="16" r="1.8" fill="var(--paper)" />
      </svg>
      <span className="wordmark__text">
        Premium Jeep <span>Rentals</span>
      </span>
    </span>
  )
}

export function Header() {
  const [menu, setMenu] = useState(false)
  const { s, dispatch } = useTrip()
  // the arrival screen has its own trip bar; the header button appears once it scrolls away
  const [builderInView, setBuilderInView] = useState(true)
  useEffect(() => {
    const el = document.getElementById('build')
    if (!el) return
    // "in view" means it fills a fair part of the screen; the builder can be
    // much taller than the window on phones, so a ratio of its own height won't do
    const steps = Array.from({ length: 21 }, (_, i) => i / 20)
    const io = new IntersectionObserver(([e]) => setBuilderInView(e.intersectionRect.height > window.innerHeight * 0.35), { threshold: steps })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const showCta = !builderInView
  const build = () => {
    setMenu(false)
    if (s.step === 0) dispatch({ type: 'step', step: 1 })
    scrollToBuilder()
  }
  useEffect(() => {
    document.documentElement.style.overflow = menu ? 'hidden' : ''
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [menu])

  return (
    <header className="header" data-menu={menu || undefined} data-sky={(builderInView && s.step === 0) || undefined}>
      <div className="header__bar">
        <a className="header__home" href="#build" aria-label={`${site.name}, home`}>
          <Wordmark />
        </a>
        <nav className="header__nav" aria-label="Main">
          {site.nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setMenu(false)}>
              {n.label}
            </a>
          ))}
          <button type="button" className="btn btn--book header__menucta" onClick={build}>
            {s.step === 0 ? 'Build your trip' : 'Back to your trip'}
          </button>
        </nav>
        <button className="btn btn--ink btn--small header__cta" onClick={build} data-hidden={!showCta || undefined} tabIndex={showCta ? 0 : -1}>
          <span>
            {s.step === 0 ? (
              <>Build<span className="header__cta-long"> your trip</span></>
            ) : (
              <><span className="header__cta-long">Back to y</span><span className="header__cta-short">Y</span>our trip</>
            )}
          </span>
        </button>
        <button className="header__burger" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
