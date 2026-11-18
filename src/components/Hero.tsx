import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { baseById, type BaseId } from '../data/places'
import { formatShort } from '../lib/dates'
import { useTrip } from '../lib/trip'
import { useWide } from '../lib/useWide'
import { Calendar, DateHalves, type DateEnd } from './DateRange'
import { Icon } from './Icon'
import { PlaceList, PlaceMap } from './PlaceMap'

/*
  The first screen: what this is, and everything a renter has to decide
  before choosing a Jeep (where, and when), in one place.

  The trip bar lies on the sand. Opening any of its fields turns the space
  above it into a planner: the headline steps aside and a card rises with
  the chart of the four pick-up places, then the calendar. Choosing a place
  moves straight on to the dates; choosing the return day hands over to
  "Build your trip". On phones the planner opens under the bar instead.
*/

type Panel = 'where' | DateEnd | null

export function Hero({ onStart }: { onStart: () => void }) {
  const { s, dispatch } = useTrip()
  const wide = useWide()
  const [panel, setPanel] = useState<Panel>(null)
  const [hover, setHover] = useState<BaseId | null>(null)
  const [nudge, setNudge] = useState(0)
  const bar = useRef<HTMLFormElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const go = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!panel) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (bar.current?.contains(t) || card.current?.contains(t)) return
      setPanel(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])

  // on phones the planner is a sheet over the page: hold the page still under it
  useEffect(() => {
    if (!panel || wide) return
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [panel, wide])

  const toggle = (p: Exclude<Panel, null>) => {
    const target = p === 'to' && !s.from ? 'from' : p
    setPanel((cur) => (cur === target ? null : target))
  }
  const ready = () => {
    setPanel(null)
    setNudge((n) => n + 1)
    go.current?.focus({ preventScroll: true })
  }
  const pickPlace = (b: BaseId) => {
    dispatch({ type: 'base', base: b })
    if (!s.from || !s.to) setPanel(s.from ? 'to' : 'from')
    else ready()
  }

  const base = baseById(s.base)
  const planner = panel && (
    <div className="tplan" ref={card} data-panel={panel === 'where' ? 'where' : 'when'} role="dialog" aria-label={panel === 'where' ? 'Choose where to pick up' : 'Choose your dates'}>
      <div className="tplan__head">
        <ol className="tplan__tabs">
          <li>
            <button type="button" aria-current={panel === 'where' || undefined} onClick={() => setPanel('where')}>
              <span className="tplan__n">1</span>
              <span>Where</span>
              <em>{base.short}</em>
            </button>
          </li>
          <li>
            <button type="button" aria-current={panel !== 'where' || undefined} onClick={() => setPanel(s.from && s.to ? 'to' : 'from')}>
              <span className="tplan__n">2</span>
              <span>When</span>
              <em>{s.from && s.to ? `${formatShort(s.from)} to ${formatShort(s.to)}` : 'Add dates'}</em>
            </button>
          </li>
        </ol>
        <button type="button" className="tplan__close" onClick={() => setPanel(null)} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
      </div>
      {panel === 'where' ? (
        <div className="tplan__where">
          <PlaceMap value={s.base} hover={hover} onHover={setHover} onPick={pickPlace} />
          <div className="tplan__side">
            <p className="tplan__hint">Where should the Jeep meet you?</p>
            <PlaceList value={s.base} hover={hover} onHover={setHover} onPick={pickPlace} />
          </div>
        </div>
      ) : (
        <Calendar
          from={s.from}
          to={s.to}
          editing={panel}
          onEditing={(e) => setPanel(e)}
          onChange={(f, t) => dispatch({ type: 'dates', from: f, to: t })}
          onDone={ready}
        />
      )}
    </div>
  )

  return (
    <div className="hero" data-planning={(panel && wide) || undefined}>
      <div className="hero__head">
        <div className="hero__words" aria-hidden={(panel && wide) || undefined}>
          <p className="hero__kicker chart-voice">Ready for your Cape and Islands adventure?</p>
          <h1 className="hero__title display">For when “a rental car” just won’t do.</h1>
          <p className="hero__lede">
            Brand-new Jeep Wrangler Rubicons, waiting for you on Nantucket, Martha’s Vineyard, Cape Cod and in Boston. Choose yours, kit it out for the beach and plan the drive.
          </p>
        </div>
        {wide && planner}
      </div>
      <div className="hero__foot">
        <form
          ref={bar}
          className="tripbar"
          data-open={panel || undefined}
          onSubmit={(e) => {
            e.preventDefault()
            setPanel(null)
            onStart()
          }}
        >
          <button type="button" className="tripbar__where" data-active={panel === 'where' || undefined} aria-expanded={panel === 'where'} onClick={() => toggle('where')}>
            <span className="tripbar__label">Pick up in</span>
            <span className="tripbar__value">
              <Icon name="pin" size={15} />
              {base.short}
            </span>
          </button>
          <span className="tripbar__rule" aria-hidden="true" />
          <div className="tripbar__dates dates__field" role="group" aria-label="Trip dates">
            <DateHalves from={s.from} to={s.to} active={panel === 'from' || panel === 'to' ? panel : null} onOpen={toggle} />
          </div>
          <button ref={go} className="btn btn--book tripbar__go" type="submit" key={nudge} data-nudge={nudge > 0 || undefined}>
            Build your trip
          </button>
        </form>
        {/* phones: the planner is a sheet over the whole page, so it lives at the top of the document */}
        {!wide &&
          panel &&
          createPortal(
            <>
              <div className="tplan__scrim" onClick={() => setPanel(null)} aria-hidden="true" />
              {planner}
            </>,
            document.body,
          )}
        <ul className="hero__facts">
          <li><Icon name="calendar" size={17} /> 2025 and 2026 models</li>
          <li><Icon name="seat" size={17} /> Leather, low miles</li>
          <li><Icon name="roof" size={17} /> Power sky roof</li>
        </ul>
      </div>
    </div>
  )
}

/*
  The set behind the Jeep: a Cape Cod beach drawn in layers.

  Sky with a low sun and a few slow clouds, a far headland with its
  lighthouse, the sea, a line of surf, wet sand, then dry sand. Dunes with
  beach grass and a snow fence frame the shot at either side. Everything is
  placed against --horizon, which the 3D camera reports, so when the camera
  tilts the whole beach tilts with it and the Jeep always stands on the sand.
*/

// deterministic scatter, so the grass is the same on every render
function rand(seed: number) {
  let t = seed
  return () => {
    t = (t * 16807) % 2147483647
    return (t - 1) / 2147483646
  }
}

const DUNE_W = 400
const DUNE_H = 140
/** height of the dune's crest at x, in viewBox units from the top */
function crest(x: number) {
  const a = 62 * Math.exp(-(((x - 70) / 95) ** 2))
  const b = 34 * Math.exp(-(((x - 210) / 80) ** 2))
  const c = 12 * Math.exp(-(((x - 320) / 60) ** 2))
  return DUNE_H - 8 - Math.max(a, b * 0.9 + a * 0.35, c + b * 0.3)
}

function dunePath() {
  const pts: string[] = []
  for (let x = 0; x <= DUNE_W; x += 8) pts.push(`${x} ${crest(x).toFixed(1)}`)
  return `M0 ${DUNE_H} L${pts.join(' L')} L${DUNE_W} ${DUNE_H} Z`
}

function grass(seed: number) {
  const r = rand(seed)
  const blades: { d: string; o: number; w: number }[] = []
  for (let i = 0; i < 46; i++) {
    const x = 6 + r() * 290
    const base = crest(x) + 2
    const n = 4 + Math.floor(r() * 5)
    const tall = 10 + r() * 16 * (base < 90 ? 1.2 : 0.8)
    for (let k = 0; k < n; k++) {
      const lean = (r() - 0.5) * 16 + 5
      const h = tall * (0.55 + r() * 0.5)
      const bx = x + (r() - 0.5) * 5
      blades.push({
        d: `M${bx.toFixed(1)} ${base.toFixed(1)} Q${(bx + lean * 0.3).toFixed(1)} ${(base - h * 0.6).toFixed(1)} ${(bx + lean).toFixed(1)} ${(base - h).toFixed(1)}`,
        o: 0.55 + r() * 0.45,
        w: 0.8 + r() * 0.7,
      })
    }
  }
  return blades
}

function fence() {
  const posts: { x: number; y: number; h: number }[] = []
  for (let x = 150; x <= 290; x += 6.5) posts.push({ x, y: crest(x) + 9, h: 13 })
  return posts
}

const DUNE = dunePath()
const GRASS_L = grass(7)
const GRASS_R = grass(31)
const FENCE = fence()

function Dune({ side, seed }: { side: 'left' | 'right'; seed: number }) {
  const blades = side === 'left' ? GRASS_L : GRASS_R
  const id = `dune-${side}`
  return (
    <svg className={`set__dune set__dune--${side}`} viewBox={`0 0 ${DUNE_W} ${DUNE_H}`} preserveAspectRatio="xMinYMax meet">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe4ca" />
          <stop offset="0.55" stopColor="#e6d8b8" />
          <stop offset="1" stopColor="#ecdfc3" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9b48a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#c9b48a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={side === 'right' ? `translate(${DUNE_W} 0) scale(-1 1)` : undefined}>
        <path d={DUNE} fill={`url(#${id}-fill)`} />
        <path d={DUNE} fill={`url(#${id}-shade)`} transform="translate(14 6)" opacity="0.6" />
        {seed % 2 === 1 && (
          <g className="set__fence">
            <path d={`M${FENCE.map((p) => `${p.x} ${p.y - p.h * 0.75}`).join(' L')}`} />
            <path d={`M${FENCE.map((p) => `${p.x} ${p.y - p.h * 0.3}`).join(' L')}`} />
            {FENCE.map((p, i) => (
              <rect key={i} x={p.x - 0.9} y={p.y - p.h} width="1.8" height={p.h} rx="0.6" />
            ))}
          </g>
        )}
        <g className="set__grass">
          {blades.map((b, i) => (
            <path key={i} d={b.d} strokeOpacity={b.o} strokeWidth={b.w} />
          ))}
        </g>
      </g>
    </svg>
  )
}

export function Scenery() {
  return (
    <div className="set" aria-hidden="true">
      <div className="set__sky">
        <div className="set__sun" />
        <div className="set__cloud set__cloud--a" />
        <div className="set__cloud set__cloud--b" />
        <div className="set__cloud set__cloud--c" />
      </div>
      <svg className="set__far set__far--left" viewBox="0 0 300 30" preserveAspectRatio="xMinYMax meet">
        <path d="M0 30 C40 22 80 19 130 18 C170 17 200 21 240 25 C265 27 285 29 300 30 Z" />
        <g transform="translate(118 0)">
          <path d="M3 18 L4.5 6 L9.5 6 L11 18 Z" />
          <rect x="4.2" y="3.4" width="5.6" height="2.6" />
          <path d="M5 3.4 L7 0.8 L9 3.4 Z" />
        </g>
      </svg>
      <svg className="set__far set__far--right" viewBox="0 0 300 30" preserveAspectRatio="xMaxYMax meet">
        <path d="M0 30 C60 25 110 23 170 24 C220 25 260 27 300 30 Z" />
      </svg>
      <div className="set__sea">
        <svg className="set__sail" viewBox="0 0 20 22">
          <path d="M10 0 L10 17 L2 17 Z" />
          <path d="M11 3 L11 17 L17 17 Z" opacity="0.8" />
          <path d="M1 18 L19 18 L16 21 L4 21 Z" />
        </svg>
      </div>
      <div className="set__sand" />
      <svg className="set__surf" viewBox="0 0 1200 20" preserveAspectRatio="none">
        <path className="set__surf-wash" d="M0 6 C60 2 120 11 200 7 S330 3 420 8 S560 12 660 6 S820 2 920 8 S1100 11 1200 6 L1200 20 L0 20 Z" />
        <path className="set__surf-line" d="M0 6 C60 2 120 11 200 7 S330 3 420 8 S560 12 660 6 S820 2 920 8 S1100 11 1200 6" />
      </svg>
      <Dune side="left" seed={2} />
      <Dune side="right" seed={1} />
    </div>
  )
}
