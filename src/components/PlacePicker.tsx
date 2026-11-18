import { useEffect, useRef, useState } from 'react'
import { bases, type BaseId } from '../data/places'
import { Icon } from './Icon'
import './PlacePicker.css'

/* "Pick up in": a field that opens a short list of the four places. */
export function PlacePicker({ value, onChange }: { value: BaseId; onChange: (b: BaseId) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = bases.find((b) => b.id === value)!

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="picker" ref={root} data-open={open || undefined}>
      <button type="button" className="picker__field" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="picker__label">Pick up in</span>
        <span className="picker__value">{current.name}</span>
        <Icon name="chevron" size={16} className="picker__chev" />
      </button>
      {open && (
        <div className="picker__pop" role="group" aria-label="Pick-up place">
          {bases.map((b) => (
            <button
              key={b.id}
              type="button"
              className="picker__opt"
              aria-pressed={b.id === value}
              onClick={() => {
                onChange(b.id)
                setOpen(false)
              }}
            >
              <span>
                <strong>{b.name}</strong>
                <small>{b.where}</small>
              </span>
              {b.id === value && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
