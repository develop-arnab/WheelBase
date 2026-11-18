import { useEffect, useRef, useState } from 'react'
import { wheelbase } from '../config/site'
import { MODEL, SEATS, roofs } from '../data/fleet'
import { useTrip, usd, type Step } from '../lib/trip'
import { scrollToBuilder } from '../lib/scroll'
import { useWheelbase, wheelbaseQuery } from '../lib/wheelbase'
import { PHONE_SCENE, useMedia, useWide } from '../lib/useWide'
import type { View } from '../stage/JeepRenderer'
import { Hero, Scenery } from './Hero'
import { Icon } from './Icon'
import { JeepStage } from './JeepStage'
import { RouteMap } from './RouteMap'
import { Kit } from './steps/Kit'
import { Pass, sendTripToTeam, tripSummary } from './steps/Pass'
import { PickJeep } from './steps/PickJeep'
import { RoutePlan } from './steps/RoutePlan'
import './Builder.css'

/*
  One stage, two layouts.

  Step 0 is the arrival: the Jeep waits on the beach, the headline and trip
  bar sit beside it. "Build your trip" doesn't leave the page; the panel slides
  in, the camera re-frames, and the same Jeep becomes the configurator.
  Step 3 drives it off the set and onto the map; step 4 brings it back.
*/

const STEPS: { n: 1 | 2 | 3 | 4; label: string }[] = [
  { n: 1, label: 'Jeep' },
  { n: 2, label: 'Kit' },
  { n: 3, label: 'Route' },
  { n: 4, label: 'Trip pass' },
]
const NEXT: Record<Step, string> = { 0: 'Build your trip', 1: 'Kit it out', 2: 'Plan the route', 3: 'See your trip pass', 4: '' }
const STEP_VIEW: Record<Step, View> = { 0: 'hero', 1: 'pick', 2: 'kit', 3: 'hero', 4: 'hero' }
const VIEW_BUTTONS: { view: View; label: string }[] = [
  { view: 'front', label: 'Front' },
  { view: 'side', label: 'Side' },
  { view: 'rear', label: 'Rear' },
  { view: 'above', label: 'Above' },
]

export function Builder() {
  const { s, d, dispatch } = useTrip()
  const [focus, setFocus] = useState<string | null>(null)
  const [checkout, setCheckout] = useState(false)
  const [manualView, setManualView] = useState<View | null>(null)
  const [stageState, setStageState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [touched, setTouched] = useState(false)
  const wide = useWide()
  const hero = s.step === 0
  const onMap = s.step === 3
  const [mapShown, setMapShown] = useState(onMap)
  const panel = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)

  // the map fades in once the Jeep has driven off, and out at once when leaving
  useEffect(() => {
    if (!onMap) {
      setMapShown(false)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setMapShown(true), reduced ? 0 : 620)
    return () => clearTimeout(t)
  }, [onMap])

  useEffect(() => setManualView(null), [s.step])

  const go = (step: Step) => {
    dispatch({ type: 'step', step })
    panel.current?.scrollTo({ top: 0 })
    scrollToBuilder()
  }

  const summary: Record<1 | 2 | 3 | 4, string> = {
    1: d.vehicle.name,
    2: s.extras.length ? `${s.extras.length} ${s.extras.length === 1 ? 'item' : 'items'}` : 'Optional',
    3: s.stops.length ? `${s.stops.length} ${s.stops.length === 1 ? 'stop' : 'stops'}` : 'Optional',
    4: d.days ? usd(d.total) : 'Review',
  }
  const canReserve = d.avail.state === 'free'
  const view = manualView ?? STEP_VIEW[s.step]
  // in the arrival layout the Jeep stands right of the headline
  const phoneScene = useMedia(PHONE_SCENE)
  const shortPhone = useMedia('(max-height: 700px)')
  // wide: the Jeep sits right of the headline. Phones: it fills the width of a
  // tall frame and sits low, under the headline and above the trip bar.
  const shift = hero && wide ? 0.44 : 0
  const zoomBias = hero ? (wide ? 1.0 : phoneScene ? 0.93 : 0.84) : wide ? 1 : 0.88
  const lift = hero && phoneScene ? (shortPhone ? 0.15 : 0.6) : 0

  return (
    <section className="builder" id="build" ref={root} data-mode={hero ? 'hero' : 'build'} data-step={s.step} data-set aria-label="Build your trip">
      <div className="builder__stage" data-map={mapShown || undefined} data-loading={stageState === 'loading' || undefined}>
        <div className="studio" aria-hidden={mapShown}>
          <Scenery />
          <JeepStage
            paint={d.paint.hex}
            roof={s.roof}
            roofOpen={s.roofOpen}
            accessories={d.accessories}
            view={view}
            present={!onMap}
            idleSpin={hero}
            shift={shift}
            zoomBias={zoomBias}
            lift={lift}
            onTouched={() => setTouched(true)}
            onState={setStageState}
            label={`${d.vehicle.name}, a ${d.paint.name} Jeep Wrangler Rubicon with a ${roofs[s.roof].name.toLowerCase()}`}
          />
        </div>
        <div className="builder__map" aria-hidden={!mapShown}>
          <RouteMap
            base={s.base}
            stops={s.stops}
            legs={d.legs}
            paint={d.paint.hex}
            active={mapShown}
            focus={focus}
            onFocus={setFocus}
            onToggle={(id) => dispatch({ type: 'stop', id })}
          />
        </div>

        {/* showroom placard */}
        <div className="placard" key={d.vehicle.id}>
          <p className="placard__name display">{d.vehicle.name}</p>
          <p className="placard__meta">{d.vehicle.year} {MODEL}</p>
          <p className="placard__where">
            <span className="placard__place"><Icon name="pin" size={14} /> Waiting in {d.base.where}</span>
            <span className="placard__status" data-state={d.avail.state}>
              {d.avail.state === 'free'
                ? 'Free on your dates'
                : d.avail.state === 'booked'
                  ? d.alternatives.length
                    ? `Out then. ${d.alternatives.length} other ${d.alternatives.length === 1 ? 'Jeep is' : 'Jeeps are'} free here`
                    : 'Out on some of those days'
                  : `$${d.vehicle.dayRate} a day`}
            </span>
          </p>
          <ul className="placard__chips">
            <li><i style={{ background: d.paint.hex }} />{d.paint.name}</li>
            <li>{roofs[s.roof].name}</li>
            <li>Seats {SEATS}</li>
          </ul>
        </div>

        {stageState === 'ready' && (
          <div className="stagectl">
            {!touched && <p className="stagectl__hint"><Icon name="rotate" size={15} /> Drag to look around</p>}
            {!hero && (
              <div className="stagectl__views" role="group" aria-label="Camera">
                {VIEW_BUTTONS.map((v) => (
                  <button key={v.view} aria-pressed={manualView === v.view} onClick={() => setManualView(v.view)}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="stepper" aria-label="Trip steps">
        <ol>
          {STEPS.map((x) => {
            const done = s.step > x.n && d.complete[x.n]
            return (
              <li key={x.n}>
                <button aria-current={s.step === x.n ? 'step' : undefined} data-done={done || undefined} onClick={() => go(x.n)} title={summary[x.n]}>
                  <span className="stepper__n">{done ? <Icon name="check" size={13} /> : x.n}</span>
                  <span className="stepper__label">{x.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <Hero onStart={() => go(1)} />

      <div className="builder__side" aria-hidden={hero}>
        <div className="side">
          <div className="side__panel" ref={panel}>
            <div className="side__in" key={s.step}>
              {s.step === 1 && <PickJeep />}
              {s.step === 2 && <Kit />}
              {s.step === 3 && <RoutePlan focus={focus} onFocus={setFocus} />}
              {s.step === 4 && <Pass />}
            </div>
          </div>

          <div className="totalbar">
            <div className="totalbar__sum" aria-live="polite">
              {d.days ? (
                <>
                  <small>{d.days} {d.days === 1 ? 'day' : 'days'}, estimated</small>
                  <strong>{usd(d.total)}</strong>
                </>
              ) : (
                <>
                  <small>{d.vehicle.name}{d.kitPerDay ? ' with kit' : ''}</small>
                  <strong>{usd(d.vehicle.dayRate + d.kitPerDay)}<span> a day</span></strong>
                </>
              )}
            </div>
            {s.step > 0 && (
              <button className="totalbar__back" onClick={() => go((s.step - 1) as Step)} aria-label={s.step === 1 ? 'Back to the start' : 'Back'}>
                <Icon name="arrowLeft" size={18} />
              </button>
            )}
            {s.step < 4 ? (
              <button className="btn btn--ink totalbar__next" onClick={() => go((s.step + 1) as Step)}>
                {NEXT[s.step]}
              </button>
            ) : canReserve ? (
              <button className="btn btn--book totalbar__next" onClick={() => setCheckout(true)}>
                Reserve<span className="totalbar__long"> {d.vehicle.name}</span>
              </button>
            ) : (
              <button className="btn btn--ink totalbar__next" onClick={() => go(1)}>
                {d.avail.state === 'no-dates' ? 'Add your dates' : 'Pick a free Jeep'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Checkout open={checkout} onClose={() => setCheckout(false)} />
    </section>
  )
}

/*
  Reserve.
  Phase 1: says plainly that online checkout is not connected yet and offers
  to send the trip to the team. Phase 2: with a Wheelbase dealer ID set, the
  live Wheelbase store opens here with the dates passed through.
*/
function Checkout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, d } = useTrip()
  const live = Boolean(wheelbase.dealerId)
  const wb = useWheelbase(live && open)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    box.current?.focus()
    if (live) {
      const q = wheelbaseQuery(s.from, s.to)
      window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`)
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [open, onClose, live, s.from, s.to])

  return (
    <div className="sheet" data-open={open || undefined} aria-hidden={!open}>
      <div className="sheet__scrim" onClick={onClose} />
      <div className="sheet__box" role="dialog" aria-modal="true" aria-label={`Reserve ${d.vehicle.name}`} tabIndex={-1} ref={box}>
        <button className="sheet__close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        {live ? (
          wb === 'ready' ? (
            <wheelbase-store
              dealer-id={wheelbase.dealerId}
              locale={wheelbase.locale}
              store-type={wheelbase.storeType}
              hide-hero
              primary-color={wheelbase.theme.primaryColor}
              secondary-color={wheelbase.theme.secondaryColor}
              text-color={wheelbase.theme.textColor}
              text-secondary-color={wheelbase.theme.textSecondaryColor}
              surface-color={wheelbase.theme.surfaceColor}
              card-color={wheelbase.theme.cardColor}
              border-color={wheelbase.theme.borderColor}
            />
          ) : wb === 'error' ? (
            <p className="sheet__state">Booking didn’t load. Check your connection and try again, or send the trip to us below.</p>
          ) : (
            <p className="sheet__state chart-voice">Opening checkout…</p>
          )
        ) : (
          <div className="sheet__body">
            <p className="sheet__title display">{d.vehicle.name} is free.</p>
            <p>Online checkout is being connected to the booking system. Until then, send us this trip and we’ll confirm it by email, usually the same day.</p>
            <pre className="sheet__summary">{tripSummary(s, d)}</pre>
            <button className="btn btn--book" onClick={() => { onClose(); sendTripToTeam(tripSummary(s, d)) }}>
              Send this trip to the team
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
