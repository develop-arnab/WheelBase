/* One stroke style for every icon: 24-unit grid, 1.7 stroke, round caps. */
const paths: Record<string, string> = {
  lighthouse: 'M10 21 11 8h2l1 13M9.5 8h5M12 3.5 9.5 6h5ZM8 21h8M11.3 13h1.4M3 7l4 1M21 7l-4 1',
  beach: 'M4 11a8 8 0 0 1 16 0ZM12 11v8M8 11c0-3 1.5-6 4-8M16 11c0-3-1.5-6-4-8M3 21c3-1.3 6-1.3 9 0s6 1.3 9 0',
  town: 'M4 20V11l5-4 5 4v9M14 20v-6l3-3 3 3v6M3 20h18M8 20v-4h2v4',
  harbor: 'M12 4v12M8 8h8M12 16c-3 0-5-2-6-4M12 16c3 0 5-2 6-4M3 20c3-1.3 6-1.3 9 0s6 1.3 9 0',
  cliffs: 'M3 20V12l3-2 2 3 3-5 3 4 2-3 5 3v8M3 16h18',
  dunes: 'M2 18c3-5 6-7 9-7 4 0 6 3 11 7M7 18c2-2 4-3 7-3M5 9v4M5 9l2-2M5 10 3 8',
  surf: 'M7 21c-2-5 1-15 9-18 2 5-1 15-9 18ZM8.5 18 15 5',
  kayak: 'M2 14c4-3 16-3 20 0-4 3-16 3-20 0ZM10 14h4M6 6l12 14',
  boards: 'M5 4h5v16H5zM14 4h5v16h-5zM5 8h5M5 12h5M5 16h5M14 8h5M14 12h5M14 16h5',
  cooler: 'M4 9h16v10H4zM4 9l1-3h14l1 3M10 6V4h4v2M4 13h16',
  seat: 'M8 3h6a2 2 0 0 1 2 2v7l2 3v6H9l-3-8V5a2 2 0 0 1 2-2ZM9 21v-3M16 15H8',
  ferry: 'M4 15h16l-2 4H6zM7 15v-4h10v4M10 11V8h4v3M3 21c3-1.3 6-1.3 9 0s6 1.3 9 0',
  sand: 'M3 17c3-2 6-2 9 0s6 2 9 0M6 12h.01M10 10h.01M14 12h.01M18 10h.01M8 15h.01M16 15h.01',
  check: 'M5 12.5 10 17l9-10',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  pin: 'M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  roof: 'M3 14h18M5 14V9h14v5M8 9l1-3h6l1 3',
  shuffle: 'M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  chevron: 'm6 9 6 6 6-6',
  front: 'M5 17V9l2-3h10l2 3v8M5 13h14M8 17v2M16 17v2M8 10h.01M16 10h.01',
  rotate: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
