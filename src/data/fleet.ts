import type { BaseId } from './places'

/*
  PLACEHOLDER FLEET. Every name, colour, rate and booking below is invented
  so the builder can be designed against something realistic. In Phase 2 this
  file is replaced by listings and availability from Wheelbase.

  What is real: the client rents 2025–2026 Jeep Wrangler Rubicons with
  leather and low miles, in Boston, on Cape Cod, Nantucket and Martha's
  Vineyard. The 3D model is the 2-door Wrangler, so the copy says 2-door.
*/

export type PaintId = 'red' | 'white' | 'blue' | 'green' | 'grey' | 'navy'
export type Roof = 'sky' | 'hardtop'

export const paints: Record<PaintId, { name: string; hex: string }> = {
  red: { name: 'Nantucket red', hex: '#b3322c' },
  white: { name: 'Lighthouse white', hex: '#eceee9' },
  blue: { name: 'Hydrangea blue', hex: '#3f6fb0' },
  green: { name: 'Beach-grass green', hex: '#5e7a4a' },
  grey: { name: 'Fog grey', hex: '#8a949c' },
  navy: { name: 'Atlantic navy', hex: '#1d3557' },
}
export const paintOrder: PaintId[] = ['red', 'white', 'blue', 'green', 'grey', 'navy']

export const roofs: Record<Roof, { name: string; line: string }> = {
  sky: { name: 'Power sky roof', line: 'One button and the canvas slides back.' },
  hardtop: { name: 'Hardtop', line: 'Colour-matched, quiet, panels lift off by hand.' },
}

export type Vehicle = {
  id: string
  name: string
  year: 2025 | 2026
  base: BaseId
  paint: PaintId
  roof: Roof
  dayRate: number
  line: string
  /** Booked stretches, as [first day, last day] counted from today. Placeholder for Wheelbase availability. */
  booked: [number, number][]
}

export const MODEL = 'Wrangler Rubicon 2-door'
export const SEATS = 4

export const fleet: Vehicle[] = [
  // Nantucket
  { id: 'madaket', name: 'Madaket', year: 2026, base: 'nantucket', paint: 'red', roof: 'sky', dayRate: 345, line: 'Roof back, west end, last light.', booked: [[3, 9], [24, 30]] },
  { id: 'brant-point', name: 'Brant Point', year: 2026, base: 'nantucket', paint: 'white', roof: 'hardtop', dayRate: 325, line: 'Bright white against grey shingles.', booked: [[12, 16]] },
  { id: 'wauwinet', name: 'Wauwinet', year: 2025, base: 'nantucket', paint: 'navy', roof: 'sky', dayRate: 315, line: 'Built for the sand track to Great Point.', booked: [[0, 4], [18, 21]] },
  { id: 'sconset', name: 'Sconset', year: 2025, base: 'nantucket', paint: 'grey', roof: 'sky', dayRate: 299, line: 'Fog-coloured, for rose-covered lanes.', booked: [[6, 13]] },
  // Martha's Vineyard
  { id: 'menemsha', name: 'Menemsha', year: 2026, base: 'marthas-vineyard', paint: 'blue', roof: 'sky', dayRate: 335, line: 'Up-island blue, for sunsets on the dock.', booked: [[2, 6], [15, 22]] },
  { id: 'aquinnah', name: 'Aquinnah', year: 2026, base: 'marthas-vineyard', paint: 'red', roof: 'hardtop', dayRate: 320, line: 'Clay-cliff red, top on for the wind.', booked: [[9, 14]] },
  { id: 'chappy', name: 'Chappy', year: 2025, base: 'marthas-vineyard', paint: 'green', roof: 'sky', dayRate: 299, line: 'Disappears into the dunes, which is the idea.', booked: [[4, 7], [20, 27]] },
  { id: 'edgartown', name: 'Edgartown', year: 2025, base: 'marthas-vineyard', paint: 'white', roof: 'sky', dayRate: 310, line: 'Whaling-captain white, harbour views.', booked: [[0, 2]] },
  // Cape Cod
  { id: 'race-point', name: 'Race Point', year: 2026, base: 'cape-cod', paint: 'grey', roof: 'hardtop', dayRate: 305, line: 'The colour of a June morning on the outer Cape.', booked: [[5, 11]] },
  { id: 'chatham', name: 'Chatham', year: 2026, base: 'cape-cod', paint: 'navy', roof: 'sky', dayRate: 315, line: 'Lighthouse to fish pier and back.', booked: [[1, 3], [14, 19]] },
  { id: 'nauset', name: 'Nauset', year: 2025, base: 'cape-cod', paint: 'green', roof: 'hardtop', dayRate: 289, line: 'Quiet green for the National Seashore.', booked: [[8, 10]] },
  { id: 'wellfleet', name: 'Wellfleet', year: 2025, base: 'cape-cod', paint: 'white', roof: 'sky', dayRate: 299, line: 'Oysters, dunes, drive-in movies.', booked: [[16, 23]] },
  // Boston
  { id: 'long-wharf', name: 'Long Wharf', year: 2026, base: 'boston', paint: 'navy', roof: 'hardtop', dayRate: 285, line: 'Leaves the city, reaches the bridge by lunch.', booked: [[2, 8]] },
  { id: 'beacon', name: 'Beacon', year: 2025, base: 'boston', paint: 'red', roof: 'sky', dayRate: 279, line: 'Red brick red, for the drive down Route 3.', booked: [[10, 15]] },
]

export const vehicleById = (id: string | null) => fleet.find((v) => v.id === id) ?? null
export const fleetAt = (base: BaseId) => fleet.filter((v) => v.base === base)
