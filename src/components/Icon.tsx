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
  axle: 'M5 7v10M19 7v10M5 12h14M3 7h4M3 17h4M17 7h4M17 17h4',
  key: 'M8.5 15.5a4.5 4.5 0 1 1 3.2-1.3L20 6M16.5 9.5l2 2M18.5 7.5l2 2',
  mail: 'M3 6h18v12H3zM3 7l9 6.5L21 7',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.3 3 3.5 6',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
