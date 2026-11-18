import { useEffect, useState } from 'react'
import { JeepRenderer } from '../stage/JeepRenderer'

/*
  Still pictures of the Jeep, rendered from the same 3D model as the builder.

  One hidden renderer draws each requested combination of paint, roof and
  angle once, on idle time, one at a time, and keeps the image for the rest
  of the visit. Sections ask for a still with useStill(); they get null
  until it is ready (and stay null where WebGL2 is unavailable, so callers
  show the 2D illustration instead).
*/

export type StillAngle = 'front' | 'side' | 'rear' | 'hero'
export type StillRequest = { paint: string; roof: 'sky' | 'hardtop'; angle: StillAngle }

const ANGLES: Record<StillAngle, { yaw: number; pitch: number; zoom: number; ty: number }> = {
  hero: { yaw: 0.78, pitch: 0.1, zoom: 0.68, ty: 0.86 },
  front: { yaw: 0.42, pitch: 0.09, zoom: 0.68, ty: 0.86 },
  side: { yaw: Math.PI / 2, pitch: 0.05, zoom: 0.66, ty: 0.86 },
  rear: { yaw: 2.6, pitch: 0.12, zoom: 0.68, ty: 0.9 },
}

const MODEL_URL = () => window.__PJR_MODEL__ ?? `${import.meta.env.BASE_URL ?? '/'}models/jeep.glb`
const key = (r: StillRequest) => `${r.paint}|${r.roof}|${r.angle}`

const done = new Map<string, string>()
const waiting = new Map<string, Set<(url: string) => void>>()
const queue: StillRequest[] = []
let renderer: Promise<JeepRenderer | null> | null = null
let working = false
let failed = false

function getRenderer() {
  if (!renderer) {
    renderer = (async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.setAttribute('aria-hidden', 'true')
        // laid out (so it has a size) but far off screen
        Object.assign(canvas.style, { position: 'fixed', left: '-10000px', top: '0', width: '960px', height: '560px', pointerEvents: 'none' })
        document.body.appendChild(canvas)
        const r = new JeepRenderer(canvas)
        await r.load(MODEL_URL())
        return r
      } catch {
        failed = true
        return null
      }
    })()
  }
  return renderer
}

const idle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 400 })
  else globalThis.setTimeout(fn, 30)
}

async function pump() {
  if (working) return
  working = true
  const r = await getRenderer()
  while (queue.length) {
    const req = queue.shift()!
    const k = key(req)
    if (done.has(k)) continue
    if (!r) break
    await new Promise<void>((resolve) => idle(() => resolve()))
    const a = ANGLES[req.angle]
    r.setPaint(req.paint, false)
    r.setRoof(req.roof, false, false)
    r.setAccessories([], false)
    r.pose(a.yaw, a.pitch, { zoom: a.zoom, ty: a.ty })
    let url = ''
    try {
      url = r.still()
    } catch {
      failed = true
      break
    }
    done.set(k, url)
    waiting.get(k)?.forEach((cb) => cb(url))
    waiting.delete(k)
  }
  working = false
}

/** Asks for a still; returns its image URL once drawn, or null until then (and if 3D is unavailable). */
export function useStill(req: StillRequest | null, enabled = true) {
  const k = req ? key(req) : ''
  const [url, setUrl] = useState<string | null>(() => (k ? done.get(k) ?? null : null))
  useEffect(() => {
    if (!req || !enabled) return
    const have = done.get(k)
    if (have) {
      setUrl(have)
      return
    }
    setUrl(null)
    if (failed) return
    const set = waiting.get(k) ?? new Set()
    const cb = (u: string) => setUrl(u)
    set.add(cb)
    waiting.set(k, set)
    queue.push(req)
    pump()
    return () => {
      set.delete(cb)
    }
    // req is described fully by k
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, enabled])
  return url
}

/** Queues stills ahead of time, so they are ready when their section scrolls in. */
export function prefetchStills(reqs: StillRequest[]) {
  for (const r of reqs) if (!done.has(key(r)) && !queue.some((q) => key(q) === key(r))) queue.push(r)
  pump()
}

export const stillsAvailable = () => !failed
