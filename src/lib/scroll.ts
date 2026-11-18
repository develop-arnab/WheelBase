/** Bring the trip builder to the top of the window, just under the sticky header. */
export function scrollToBuilder() {
  requestAnimationFrame(() => {
    const el = document.getElementById('build')
    if (!el) return
    const header = document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 0
    const top = el.getBoundingClientRect().top + window.scrollY - header
    if (Math.abs(window.scrollY - top) < 40) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  })
}
