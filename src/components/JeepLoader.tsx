import { useEffect, useRef, useState } from 'react'
import './JeepLoader.css'

/*
  While the 3D Jeep loads: the Lottie animation in public/jeep.json, with a
  real progress line under it. The player (lottie-web) is loaded on demand,
  so it never delays the page; if it can't load, the caption shows alone.
  Everything fades away as the 3D model fades in.
*/

declare global {
  interface Window {
    /** the single-file preview embeds the animation here instead of fetching it */
    __PJR_LOTTIE__?: unknown
  }
}

const ANIMATION_URL = `${import.meta.env.BASE_URL ?? '/'}jeep.json`

export function JeepLoader({ progress, leaving }: { progress: number; leaving?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const pct = Math.round(progress * 100)

  useEffect(() => {
    let live = true
    let anim: { destroy(): void } | null = null
    ;(async () => {
      try {
        const [{ default: lottie }, data] = await Promise.all([
          import('lottie-web'),
          window.__PJR_LOTTIE__ ?? fetch(ANIMATION_URL).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
        ])
        if (!live || !box.current) return
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const a = lottie.loadAnimation({
          container: box.current,
          renderer: 'svg',
          loop: !still,
          autoplay: !still,
          animationData: data,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        })
        if (still) a.goToAndStop(Math.round(a.totalFrames / 2), true)
        anim = a
        setShown(true)
      } catch {
        /* no animation: the caption and progress line carry on alone */
      }
    })()
    return () => {
      live = false
      anim?.destroy()
    }
  }, [])

  return (
    <div className="jloader" data-leaving={leaving || undefined} role="status" aria-live="polite">
      <div className="jloader__anim" ref={box} data-shown={shown || undefined} aria-hidden="true" />
      <div className="jloader__meta">
        <span className="jloader__text chart-voice">Bringing your Jeep round</span>
        <span className="jloader__track" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
        </span>
        <span className="jloader__pct">{pct}%</span>
      </div>
    </div>
  )
}
