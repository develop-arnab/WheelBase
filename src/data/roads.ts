import type { Island } from './places'

/*
  The road and ferry network the route planner drives on.
  Node and waypoint coordinates are real, but waypoints are sparse, so the
  planner multiplies road length by a winding factor and rounds what it shows.
  Ferry times are typical crossing times, not a timetable.
*/
export type RoadKind = 'highway' | 'road' | 'sand' | 'ferry'

export type RoadNode = { id: string; lat: number; lon: number; island: Island }
export type Road = { a: string; b: string; kind: RoadKind; via?: [number, number][]; minutes?: number; name?: string }

export const nodes: RoadNode[] = [
  { id: 'boston', lat: 42.3601, lon: -71.0589, island: 'mainland' },
  { id: 'plymouth', lat: 41.94, lon: -70.69, island: 'mainland' },
  { id: 'sagamore', lat: 41.7748, lon: -70.5385, island: 'mainland' },
  { id: 'bourne', lat: 41.7419, lon: -70.5996, island: 'mainland' },
  { id: 'falmouth', lat: 41.5515, lon: -70.6148, island: 'mainland' },
  { id: 'woods-hole', lat: 41.5235, lon: -70.6693, island: 'mainland' },
  { id: 'hyannis', lat: 41.6362, lon: -70.2826, island: 'mainland' },
  { id: 'orleans', lat: 41.7898, lon: -69.99, island: 'mainland' },
  { id: 'chatham', lat: 41.6713, lon: -69.9497, island: 'mainland' },
  { id: 'wellfleet', lat: 41.9376, lon: -70.0328, island: 'mainland' },
  { id: 'provincetown', lat: 42.0526, lon: -70.1868, island: 'mainland' },
  { id: 'race-point', lat: 42.0795, lon: -70.218, island: 'mainland' },

  { id: 'vineyard-haven', lat: 41.4545, lon: -70.6036, island: 'vineyard' },
  { id: 'oak-bluffs', lat: 41.4554, lon: -70.5583, island: 'vineyard' },
  { id: 'edgartown', lat: 41.389, lon: -70.5134, island: 'vineyard' },
  { id: 'chappy', lat: 41.383, lon: -70.45, island: 'vineyard' },
  { id: 'west-tisbury', lat: 41.381, lon: -70.674, island: 'vineyard' },
  { id: 'menemsha', lat: 41.3525, lon: -70.7655, island: 'vineyard' },
  { id: 'aquinnah', lat: 41.3475, lon: -70.8375, island: 'vineyard' },

  { id: 'ack-town', lat: 41.2835, lon: -70.0995, island: 'nantucket' },
  { id: 'surfside', lat: 41.2475, lon: -70.0905, island: 'nantucket' },
  { id: 'madaket', lat: 41.2725, lon: -70.1965, island: 'nantucket' },
  { id: 'sconset', lat: 41.2625, lon: -69.9645, island: 'nantucket' },
  { id: 'wauwinet', lat: 41.33, lon: -70.005, island: 'nantucket' },
  { id: 'great-point', lat: 41.3902, lon: -70.0484, island: 'nantucket' },
]

export const roads: Road[] = [
  { a: 'boston', b: 'plymouth', kind: 'highway', name: 'Route 3', via: [[42.2, -70.95], [42.07, -70.75]] },
  { a: 'plymouth', b: 'sagamore', kind: 'highway', name: 'Route 3', via: [[41.86, -70.6]] },
  { a: 'sagamore', b: 'bourne', kind: 'road', via: [[41.758, -70.57]] },
  { a: 'bourne', b: 'falmouth', kind: 'highway', name: 'Route 28', via: [[41.66, -70.615]] },
  { a: 'falmouth', b: 'woods-hole', kind: 'road' },
  { a: 'sagamore', b: 'hyannis', kind: 'highway', name: 'Route 6', via: [[41.72, -70.45], [41.69, -70.33]] },
  { a: 'hyannis', b: 'orleans', kind: 'highway', name: 'Route 6', via: [[41.69, -70.22], [41.725, -70.1], [41.765, -70.025]] },
  { a: 'orleans', b: 'chatham', kind: 'road', name: 'Route 28', via: [[41.735, -69.975]] },
  { a: 'hyannis', b: 'chatham', kind: 'road', name: 'Route 28', via: [[41.66, -70.17], [41.675, -70.05]] },
  { a: 'orleans', b: 'wellfleet', kind: 'highway', name: 'Route 6', via: [[41.84, -69.975], [41.895, -70.0]] },
  { a: 'wellfleet', b: 'provincetown', kind: 'highway', name: 'Route 6', via: [[41.995, -70.065], [42.04, -70.13]] },
  { a: 'provincetown', b: 'race-point', kind: 'road', via: [[42.068, -70.198]] },

  { a: 'vineyard-haven', b: 'oak-bluffs', kind: 'road', via: [[41.46, -70.58]] },
  { a: 'oak-bluffs', b: 'edgartown', kind: 'road', name: 'Beach Road', via: [[41.42, -70.535]] },
  { a: 'vineyard-haven', b: 'edgartown', kind: 'road', via: [[41.42, -70.575]] },
  { a: 'edgartown', b: 'chappy', kind: 'sand', name: 'Chappy ferry', via: [[41.388, -70.5]] },
  { a: 'vineyard-haven', b: 'west-tisbury', kind: 'road', via: [[41.43, -70.645]] },
  { a: 'edgartown', b: 'west-tisbury', kind: 'road', via: [[41.39, -70.6]] },
  { a: 'west-tisbury', b: 'menemsha', kind: 'road', via: [[41.365, -70.72]] },
  { a: 'menemsha', b: 'aquinnah', kind: 'road', via: [[41.35, -70.8]] },

  { a: 'ack-town', b: 'madaket', kind: 'road', name: 'Madaket Road', via: [[41.282, -70.15]] },
  { a: 'ack-town', b: 'surfside', kind: 'road' },
  { a: 'ack-town', b: 'sconset', kind: 'road', name: 'Milestone Road', via: [[41.272, -70.04]] },
  { a: 'ack-town', b: 'wauwinet', kind: 'road', name: 'Polpis Road', via: [[41.3, -70.05], [41.318, -70.02]] },
  { a: 'sconset', b: 'wauwinet', kind: 'road', via: [[41.295, -69.975]] },
  { a: 'wauwinet', b: 'great-point', kind: 'sand', name: 'Great Point track', via: [[41.36, -70.03]] },

  { a: 'woods-hole', b: 'vineyard-haven', kind: 'ferry', minutes: 45, name: 'Steamship Authority car ferry' },
  { a: 'hyannis', b: 'ack-town', kind: 'ferry', minutes: 135, name: 'Steamship Authority car ferry', via: [[41.5, -70.22], [41.36, -70.13]] },
]
