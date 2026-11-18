import { useEffect, useRef, useState } from 'react'
import { JeepRenderer, type View } from '../stage/JeepRenderer'
import { Jeep } from './Jeep'
import { JeepLoader } from './JeepLoader'
import './JeepStage.css'

/*
  React's side of the 3D Jeep. It owns the canvas and the renderer and
  forwards prop changes into it; the renderer never re-renders React.
  If WebGL2 or the model is unavailable, the 2D illustration stands in.

  Each mount creates its own canvas. React's StrictMode (npm run dev) mounts
  components twice; reusing one canvas would hand the second renderer the
  first one's discarded WebGL context and nothing would draw.
*/

declare global {
  interface Window {
    /** Set by the single-file preview build so the model can travel inside the HTML */
    __PJR_MODEL__?: string
  }
}
const MODEL_URL = () => window.__PJR_MODEL__ ?? `${import.meta.env.BASE_URL ?? '/'}models/jeep.glb`

type Props = {
  paint: string
  roof: 'sky' | 'hardtop'
  roofOpen: boolean
  accessories: string[]
  view: View
  /** false = the Jeep has driven off (the map is showing) */
  present: boolean
  idleSpin: boolean
  label: string
  /** horizontal lens shift: 0 centred, positive pushes the Jeep right */
  shift?: number
  /** > 1 pulls the camera back */
  zoomBias?: number
  /** metres added to the camera's aim: sits the Jeep lower in a tall frame */
  lift?: number
  /** fires when the visitor first drags the Jeep */
  onTouched?: () => void
  /** loading, ready, or fallback (2D illustration) */
  onState?: (state: 'loading' | 'ready' | 'fallback') => void
}

export function JeepStage({ paint, roof, roofOpen, accessories, view, present, idleSpin, label, shift = 0, zoomBias = 1, lift = 0, onTouched, onState }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const r = useRef<JeepRenderer | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [touched, setTouched] = useState(false)
  const [progress, setProgress] = useState(0)
  // the loader stays a moment after the model is ready, so it can fade out under it
  const [loaderLeaving, setLoaderLeaving] = useState(false)
  useEffect(() => {
    if (state !== 'ready') return
    setLoaderLeaving(true)
    const t = window.setTimeout(() => setLoaderLeaving(false), 900)
    return () => window.clearTimeout(t)
  }, [state])
  // previous values, so a change animates but a (StrictMode) remount does not
  const prev = useRef({ view, present })
  const props = useRef({ paint, roof, roofOpen, accessories, view, present, idleSpin, label, shift, zoomBias, lift, onTouched })
  props.current = { paint, roof, roofOpen, accessories, view, present, idleSpin, label, shift, zoomBias, lift, onTouched }

  useEffect(() => {
    const el = host.current
    if (!el) return
    let live = true
    const canvas = document.createElement('canvas')
    canvas.className = 'jstage__canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', props.current.label)
    el.prepend(canvas)

    let renderer: JeepRenderer
    try {
      renderer = new JeepRenderer(canvas)
    } catch {
      canvas.remove()
      setState('fallback')
      return
    }
    r.current = renderer
    const p = props.current
    // the scenery behind the canvas follows the camera's horizon; hooked up
    // first so the page is placed correctly before the first frame is drawn
    const set = el.closest<HTMLElement>('[data-set]')
    renderer.onHorizon = (y) => set?.style.setProperty('--horizon', `${(y * 100).toFixed(2)}%`)
    renderer.setPaint(p.paint, false)
    renderer.setRoof(p.roof, p.roofOpen, false)
    renderer.setAccessories(p.accessories, false)
    renderer.setView(p.view, false)
    renderer.setFraming(p.shift, p.zoomBias, p.lift, false)
    renderer.setAutoRotate(p.idleSpin)
    if (!p.present) renderer.driveOut()
    renderer.onInteract = () => {
      if (!live) return
      setTouched(true)
      props.current.onTouched?.()
    }
    setState('loading')
    renderer.load(MODEL_URL(), (p) => live && setProgress(p)).then(
      () => live && setState('ready'),
      () => live && setState('fallback'),
    )
    return () => {
      live = false
      renderer.dispose()
      canvas.remove()
      if (r.current === renderer) r.current = null
    }
  }, [])

  useEffect(() => { r.current?.setPaint(paint) }, [paint])
  useEffect(() => { r.current?.setRoof(roof, roofOpen) }, [roof, roofOpen])
  useEffect(() => { r.current?.setAccessories(accessories) }, [accessories])
  useEffect(() => {
    if (prev.current.view === view) return
    prev.current.view = view
    r.current?.setView(view)
  }, [view])
  useEffect(() => { r.current?.setAutoRotate(idleSpin && !touched) }, [idleSpin, touched])
  useEffect(() => { r.current?.setFraming(shift, zoomBias, lift) }, [shift, zoomBias, lift])
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  useEffect(() => { onStateRef.current?.(state) }, [state])
  useEffect(() => {
    if (prev.current.present === present) return
    prev.current.present = present
    if (present) r.current?.driveIn()
    else r.current?.driveOut()
  }, [present])
  useEffect(() => {
    host.current?.querySelector('canvas')?.setAttribute('aria-label', label)
  }, [label])

  return (
    <div className="jstage" data-state={state} ref={host}>
      {(state === 'loading' || loaderLeaving) && <JeepLoader progress={state === 'ready' ? 1 : progress} leaving={state === 'ready'} />}
      {state === 'fallback' && (
        <div className="jstage__fallback">
          <Jeep paint={paint} roof={roofOpen ? 'open' : 'closed'} />
        </div>
      )}
    </div>
  )
}
