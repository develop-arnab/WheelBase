import { useId } from 'react'
import './Jeep.css'

/*
  Side-profile 4x4, drawn in SVG so it can be repainted, opened up and driven.

  Everything that moves is driven by CSS so parents can animate it without
  re-rendering React:
    --paint   body colour
    --spin    wheel rotation (deg). Set it on any ancestor.
    [data-roof="open"]  retracts the roof canvas and drops the windows.
    [data-driving]      spins the wheels continuously (used for transitions).

  This is a stand-in illustration. When the client's own studio cut-outs
  arrive, this component is the single place to swap them in.
*/

export const BODY =
  'M60 250 L58 162 Q58 150 70 150 L268 150 L268 63 Q268 56 275 56 L490 56 L528 150 L532 150 L730 158 Q742 159 742 171 L742 232 Q742 240 734 240 L724 240 L714 198 Q711 184 698 184 L598 184 Q585 184 582 198 L572 250 L258 250 L248 198 Q245 184 232 184 L132 184 Q119 184 116 198 L106 250 Z ' +
  // window openings (even-odd holes)
  'M414 66 L482 66 L510 144 L414 144 Z M280 66 L400 66 L400 144 L280 144 Z'

export const QUARTER =
  'M62 150 L60 66 Q60 44 82 44 L268 44 L268 150 Z M82 66 L256 66 L256 142 L82 142 Z'

const FLARE =
  'M-84 254 L-72 194 Q-68 172 -48 172 L50 172 Q68 172 74 192 L86 254 L74 254 L65 200 Q62 186 50 186 L-48 186 Q-60 186 -63 200 L-74 254 Z'

const SPOKES = [0, 72, 144, 216, 288]

type Props = {
  paint?: string
  roof?: 'closed' | 'open'
  driving?: boolean
  className?: string
  title?: string
}

function Wheel({ cx }: { cx: number }) {
  return (
    <g transform={`translate(${cx} 264)`}>
      <g className="jeep__wheel">
        <circle r="66" fill="#14181c" />
        <circle r="62" fill="none" stroke="#2b3138" strokeWidth="7" strokeDasharray="8 5.5" />
        <circle r="53" fill="none" stroke="#262c33" strokeWidth="1.5" />
        <circle r="41" fill="#20262c" stroke="#a7b0b8" strokeWidth="2.5" />
        {SPOKES.map((a) => (
          <path
            key={a}
            transform={`rotate(${a})`}
            d="M-6 -12 L-9 -37 Q0 -41 9 -37 L6 -12 Z"
            fill="#89939d"
          />
        ))}
        <circle r="13" fill="#20262c" stroke="#a7b0b8" strokeWidth="2" />
        <circle r="4.5" fill="#c2413b" />
      </g>
    </g>
  )
}

export function Jeep({ paint = '#c2413b', roof = 'closed', driving, className, title }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const clip = `jeep-clip-${uid}`
  const shade = `jeep-shade-${uid}`
  const glass = `jeep-glass-${uid}`

  return (
    <svg
      className={['jeep', className].filter(Boolean).join(' ')}
      viewBox="0 0 800 346"
      data-roof={roof}
      data-driving={driving ? '' : undefined}
      style={{ ['--paint' as string]: paint }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <path d="M414 66 L482 66 L510 144 L414 144 Z" />
          <path d="M280 66 L400 66 L400 144 L280 144 Z" />
          <path d="M82 66 L256 66 L256 142 L82 142 Z" />
        </clipPath>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b5673" />
          <stop offset="0.5" stopColor="#1b2c40" />
          <stop offset="1" stopColor="#2a4159" />
        </linearGradient>
      </defs>

      <ellipse className="jeep__shadow" cx="412" cy="333" rx="372" ry="9" />

      {/* spare */}
      <rect x="8" y="126" width="46" height="134" rx="17" fill="#14181c" />
      <rect x="14" y="134" width="6" height="118" rx="3" fill="#2b3138" />
      <rect x="50" y="176" width="12" height="34" rx="3" fill="#1c2126" />

      {/* wheel wells */}
      <path d="M574 250 L584 198 Q587 186 598 186 L698 186 Q709 186 712 198 L722 250 Z" fill="#0d1115" />
      <path d="M108 250 L118 198 Q121 186 132 186 L232 186 Q243 186 246 198 L256 250 Z" fill="#0d1115" />

      {/* cabin, seen through the glass */}
      <g className="jeep__cabin">
        <path d="M74 58 L488 58 L524 150 L74 150 Z" fill="#dfe8ef" />
        <path d="M92 150 L92 62 M268 150 L268 62 M404 150 L404 62 M92 61 L486 61" stroke="#1c2126" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* saddle leather */}
        <g fill="#b07d4f">
          <rect x="430" y="100" width="34" height="56" rx="9" />
          <rect x="435" y="76" width="24" height="22" rx="8" />
          <rect x="302" y="104" width="36" height="52" rx="9" />
          <rect x="308" y="80" width="24" height="22" rx="8" />
          <rect x="148" y="112" width="60" height="44" rx="9" />
        </g>
        <path d="M486 136 q10 -16 20 -2" stroke="#1c2126" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* glass rolls down into the doors when the roof opens */}
      <g clipPath={`url(#${clip})`}>
        <g className="jeep__glass">
          <rect x="74" y="60" width="440" height="90" fill={`url(#${glass})`} />
          <path d="M120 60 L160 60 L110 150 L70 150 Z M330 60 L352 60 L302 150 L280 150 Z M452 60 L466 60 L436 150 L422 150 Z" fill="#fff" opacity="0.12" />
        </g>
      </g>

      {/* painted body */}
      <path className="jeep__paint" d={BODY} fillRule="evenodd" />
      <path d={BODY} fillRule="evenodd" fill={`url(#${shade})`} />
      <path d="M72 157 L524 157" stroke="#fff" strokeOpacity="0.32" strokeWidth="2" />
      <path d="M540 164 L724 171" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />

      {/* shut lines, hinges, handles */}
      <g fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.6">
        <path d="M408 58 L408 250" />
        <path d="M530 150 L530 244 L572 250" />
        <path d="M268 150 L268 196 Q264 232 258 250" />
        <path d="M532 176 L742 182" />
      </g>
      <g fill="#1c2126">
        <rect x="523" y="166" width="12" height="9" rx="2" />
        <rect x="523" y="216" width="12" height="9" rx="2" />
        <rect x="402" y="166" width="12" height="9" rx="2" />
        <rect x="402" y="216" width="12" height="9" rx="2" />
        <rect x="418" y="160" width="30" height="8" rx="4" />
        <rect x="278" y="160" width="30" height="8" rx="4" />
        <rect x="628" y="157" width="16" height="7" rx="2" />
        <path d="M544 190 L566 190 L562 208 L544 208 Z" opacity="0.85" />
      </g>

      {/* hardtop: rear quarter stays, canvas retracts */}
      <g className="jeep__top">
        <path d={QUARTER} fillRule="evenodd" fill="#1d2228" />
        <path d="M70 52 L262 52" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" />
        <g className="jeep__canvas">
          <path d="M262 44 L476 44 Q490 44 494 57 L262 57 Z" fill="#1d2228" />
          <path d="M270 49 L478 49" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" />
        </g>
        <path className="jeep__rail" d="M262 55 L490 55" stroke="#1d2228" strokeWidth="3.5" strokeLinecap="round" />
      </g>

      {/* mirror */}
      <path d="M512 150 L516 138" stroke="#1c2126" strokeWidth="5" strokeLinecap="round" />
      <rect x="508" y="120" width="24" height="19" rx="5" fill="#1c2126" />

      {/* flares, rails, bumpers */}
      <g fill="#1c2126">
        <path d={FLARE} transform="translate(648 0)" />
        <path d={FLARE} transform="translate(182 0)" />
        <rect x="262" y="247" width="306" height="13" rx="6" />
        <rect x="724" y="226" width="56" height="24" rx="6" />
        <rect x="38" y="232" width="70" height="20" rx="6" />
      </g>
      <rect x="768" y="232" width="10" height="12" rx="3" fill="#c2413b" />

      {/* lamps */}
      <rect x="57" y="166" width="8" height="28" rx="3" fill="#d6362f" />
      <ellipse cx="742" cy="188" rx="4.5" ry="13" fill="#fbf6df" />
      <circle cx="729" cy="205" r="4.5" fill="#f0a73a" />

      <Wheel cx={182} />
      <Wheel cx={648} />
    </svg>
  )
}
