/*
  Extras. PLACEHOLDER prices; the client has confirmed they rent extras, the
  list and rates still need their sign-off. `visible` extras appear on the
  3D Jeep; the ids match src/stage/accessories.ts.
*/
export type ExtraId = 'surf' | 'kayak' | 'traction' | 'cooler' | 'child-seat'

export type Extra = {
  id: ExtraId
  name: string
  line: string
  perDay: number
  /** Only one item from the same slot fits */
  slot?: 'roof'
  visible: boolean
  icon: 'surf' | 'kayak' | 'boards' | 'cooler' | 'seat'
}

export const extras: Extra[] = [
  { id: 'surf', name: 'Two surfboards', line: '8′ soft-tops, on a roof rack.', perDay: 35, slot: 'roof', visible: true, icon: 'surf' },
  { id: 'kayak', name: 'Sit-on-top kayak', line: 'Paddles and life vests included.', perDay: 45, slot: 'roof', visible: true, icon: 'kayak' },
  { id: 'traction', name: 'Sand recovery boards', line: 'For the day the sand wins.', perDay: 10, visible: true, icon: 'boards' },
  { id: 'cooler', name: 'Beach kit', line: 'Cooler, two chairs, hitch carrier.', perDay: 25, visible: true, icon: 'cooler' },
  { id: 'child-seat', name: 'Child seat', line: 'Fitted before you pick up.', perDay: 12, visible: false, icon: 'seat' },
]

/** The roof rack comes free with anything that rides up top */
export const RACK_PER_DAY = 0

export const extraById = (id: string) => extras.find((e) => e.id === id)!

/** Accessory ids the 3D stage should show for a set of extras */
export function stageAccessories(ids: ExtraId[]) {
  const out: string[] = []
  if (ids.some((id) => id === 'surf' || id === 'kayak' || id === 'traction')) out.push('rack')
  for (const id of ids) if (extraById(id).visible) out.push(id)
  return out
}
