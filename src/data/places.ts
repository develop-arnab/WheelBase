/*
  Where you can pick up, and where you can go.

  Coordinates are real. Spot notes are DRAFT COPY for the client to check,
  especially anything about driving on sand and permits.
*/
export type BaseId = 'boston' | 'cape-cod' | 'marthas-vineyard' | 'nantucket'
export type Island = 'mainland' | 'vineyard' | 'nantucket'
export type SpotKind = 'lighthouse' | 'beach' | 'town' | 'harbor' | 'cliffs' | 'dunes'

export type Base = { id: BaseId; name: string; short: string; node: string; island: Island; where: string; labelLeft?: boolean }
export type Spot = { id: string; name: string; node: string; island: Island; kind: SpotKind; note: string; sand?: boolean; labelLeft?: boolean }

export const bases: Base[] = [
  { id: 'nantucket', name: 'Nantucket', short: 'Nantucket', node: 'ack-town', island: 'nantucket', where: 'Nantucket town, by the ferry' },
  { id: 'marthas-vineyard', name: 'Martha’s Vineyard', short: 'The Vineyard', node: 'vineyard-haven', island: 'vineyard', where: 'Vineyard Haven, by the ferry', labelLeft: true },
  { id: 'cape-cod', name: 'Cape Cod', short: 'Cape Cod', node: 'hyannis', island: 'mainland', where: 'Hyannis' },
  { id: 'boston', name: 'Boston', short: 'Boston', node: 'boston', island: 'mainland', where: 'Boston, near Logan' },
]
export const baseById = (id: BaseId) => bases.find((b) => b.id === id)!

export const spots: Spot[] = [
  // Nantucket
  { id: 'madaket', name: 'Madaket', node: 'madaket', island: 'nantucket', kind: 'beach', labelLeft: true, note: 'The west end, and the sunset the island is known for.' },
  { id: 'sconset', name: 'Sconset', node: 'sconset', island: 'nantucket', kind: 'town', note: 'Rose-covered cottages and a footpath along the bluff.' },
  { id: 'great-point', name: 'Great Point', node: 'great-point', island: 'nantucket', kind: 'lighthouse', sand: true, note: 'Seven miles of sand track to the lighthouse. Over-sand permit, tyres aired down.' },
  { id: 'surfside', name: 'Surfside', node: 'surfside', island: 'nantucket', kind: 'beach', note: 'The south-shore beach with the waves. Ten minutes from town.' },
  // Martha's Vineyard
  { id: 'oak-bluffs', name: 'Oak Bluffs', node: 'oak-bluffs', island: 'vineyard', kind: 'town', note: 'Gingerbread cottages and the oldest carousel in the country.' },
  { id: 'edgartown', name: 'Edgartown', node: 'edgartown', island: 'vineyard', kind: 'lighthouse', note: 'White captains’ houses and a lighthouse at the harbour mouth.' },
  { id: 'chappaquiddick', name: 'Chappaquiddick', node: 'chappy', island: 'vineyard', kind: 'dunes', sand: true, note: 'A two-minute ferry from Edgartown, then sandy tracks toward Cape Poge.' },
  { id: 'menemsha', name: 'Menemsha', node: 'menemsha', island: 'vineyard', kind: 'harbor', note: 'A fishing harbour where people clap when the sun goes down.' },
  { id: 'aquinnah', name: 'Aquinnah Cliffs', node: 'aquinnah', island: 'vineyard', kind: 'cliffs', labelLeft: true, note: 'Clay cliffs in rust, ochre and white at the western tip.' },
  // Cape Cod
  { id: 'chatham', name: 'Chatham Light', node: 'chatham', island: 'mainland', kind: 'lighthouse', note: 'Watch the bars and breakers shift below the overlook.' },
  { id: 'wellfleet', name: 'Wellfleet', node: 'wellfleet', island: 'mainland', kind: 'harbor', note: 'Oysters on the pier and the last drive-in on the Cape.' },
  { id: 'provincetown', name: 'Provincetown', node: 'provincetown', island: 'mainland', kind: 'town', labelLeft: true, note: 'Commercial Street, whale watches and the end of Route 6.' },
  { id: 'race-point', name: 'Race Point', node: 'race-point', island: 'mainland', kind: 'dunes', sand: true, note: 'Dunes at the tip of the Cape. Beach driving takes a Seashore permit.' },
]
export const spotById = (id: string) => spots.find((s) => s.id === id)!

export const islandName: Record<Island, string> = { nantucket: 'Nantucket', vineyard: 'Martha’s Vineyard', mainland: 'Cape Cod' }
