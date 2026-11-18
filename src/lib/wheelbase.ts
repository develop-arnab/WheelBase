import { useEffect, useState } from 'react'
import { wheelbase } from '../config/site'

/*
  Loads the Wheelbase widget bundle once and reports when its custom
  elements are registered. The script is left in place on unmount on purpose:
  the docs' sample removes it, which breaks any other widget on the page.
*/
let loading: Promise<void> | null = null

function load() {
  if (customElements.get('wheelbase-store')) return Promise.resolve()
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.type = 'module'
      s.src = wheelbase.scriptUrl
      s.onload = () => resolve()
      s.onerror = () => {
        loading = null
        reject(new Error('Wheelbase widget failed to load'))
      }
      document.head.appendChild(s)
    })
  }
  return loading
}

export function useWheelbase(enabled: boolean) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  useEffect(() => {
    if (!enabled) return
    let live = true
    setState('loading')
    load().then(
      () => live && setState('ready'),
      () => live && setState('error'),
    )
    return () => {
      live = false
    }
  }, [enabled])
  return state
}

/** Query string the Wheelbase store reads on load to pre-select dates. */
export function wheelbaseQuery(from: string | null, to: string | null) {
  const q = new URLSearchParams()
  if (from) q.set('wb_from', from)
  if (to) q.set('wb_to', to)
  return q.toString()
}
