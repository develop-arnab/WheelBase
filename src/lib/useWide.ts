import { useEffect, useState } from 'react'

/** Follows a media query. */
export function useMedia(q: string) {
  const [on, setOn] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const change = () => setOn(mq.matches)
    change()
    mq.addEventListener('change', change)
    return () => mq.removeEventListener('change', change)
  }, [q])
  return on
}

/** True on layouts wide enough for the stage and the side panel side by side. */
export const useWide = () => useMedia('(min-width: 1080px)')

/** Phones and tablets held upright: the first screen is one full-height scene. */
export const PHONE_SCENE = '(max-width: 1079px) and (min-height: 560px)'
