import { box, ellipsoid, merge, type Mesh } from './geometry'

/*
  Accessories as simple modelled shapes, placed in the Jeep's own space
  (metres; +Z is the nose, +X the driver's side, Y up, roof at about 1.97 m).
  Each id matches an extra in src/data/extras.ts.
*/
export type AccessoryPart = { mesh: Mesh; color: string; rough: number; metal: number; clear?: number }
export type Accessory = { id: string; parts: AccessoryPart[] }

const ROOF = 1.97
const RACK_Z = -1.12

const rack = (): AccessoryPart[] => [
  {
    mesh: merge(
      box(1.62, 0.035, 0.07, [0, ROOF + 0.06, RACK_Z + 0.5], 0.4),
      box(1.62, 0.035, 0.07, [0, ROOF + 0.06, RACK_Z - 0.5], 0.4),
      box(0.05, 0.05, 1.3, [0.78, ROOF + 0.03, RACK_Z], 0.4),
      box(0.05, 0.05, 1.3, [-0.78, ROOF + 0.03, RACK_Z], 0.4),
    ),
    color: '#16191d',
    rough: 0.45,
    metal: 0.4,
  },
]

export const accessories: Accessory[] = [
  { id: 'rack', parts: rack() },
  {
    id: 'surf',
    parts: [
      { mesh: ellipsoid(0.27, 0.045, 1.08, [0.31, ROOF + 0.14, RACK_Z + 0.15], 32, 12, true), color: '#f4f1e8', rough: 0.22, metal: 0, clear: 0.6 },
      { mesh: ellipsoid(0.25, 0.045, 1.0, [-0.31, ROOF + 0.14, RACK_Z + 0.1], 32, 12, true), color: '#5d8fd0', rough: 0.22, metal: 0, clear: 0.6 },
      { mesh: merge(box(0.02, 0.006, 1.9, [0.31, ROOF + 0.187, RACK_Z + 0.15]), box(0.02, 0.006, 1.75, [-0.31, ROOF + 0.187, RACK_Z + 0.1])), color: '#c2413b', rough: 0.4, metal: 0 },
    ],
  },
  {
    id: 'kayak',
    parts: [
      { mesh: ellipsoid(0.33, 0.17, 1.8, [0, ROOF + 0.275, RACK_Z + 0.25], 36, 16), color: '#f0a43a', rough: 0.3, metal: 0, clear: 0.5 },
      { mesh: ellipsoid(0.2, 0.04, 0.4, [0, ROOF + 0.435, RACK_Z + 0.35], 24, 10), color: '#1b2026', rough: 0.6, metal: 0 },
    ],
  },
  {
    // recovery boards ride flat on the rack, under anything else up there
    id: 'traction',
    parts: [
      {
        mesh: merge(box(0.33, 0.03, 1.1, [0.42, ROOF + 0.093, RACK_Z], 0.2), box(0.33, 0.03, 1.1, [-0.42, ROOF + 0.093, RACK_Z], 0.2)),
        color: '#e8642c',
        rough: 0.65,
        metal: 0,
      },
      {
        mesh: merge(
          ...[-0.36, -0.12, 0.12, 0.36].flatMap((z) => [box(0.22, 0.012, 0.05, [0.42, ROOF + 0.112, RACK_Z + z]), box(0.22, 0.012, 0.05, [-0.42, ROOF + 0.112, RACK_Z + z])]),
        ),
        color: '#b9471c',
        rough: 0.7,
        metal: 0,
      },
    ],
  },
  {
    id: 'cooler',
    parts: [
      { mesh: merge(box(1.25, 0.05, 0.48, [0, 0.64, -2.43], 0.3), box(0.08, 0.08, 0.36, [0, 0.6, -2.18])), color: '#16191d', rough: 0.5, metal: 0.4 },
      { mesh: box(0.66, 0.36, 0.38, [-0.22, 0.85, -2.43], 0.25), color: '#f4f2ec', rough: 0.35, metal: 0 },
      { mesh: box(0.68, 0.07, 0.4, [-0.22, 1.06, -2.43], 0.35), color: '#1f3a5c', rough: 0.4, metal: 0 },
      // two folded beach chairs
      { mesh: box(0.42, 0.56, 0.05, [0.36, 0.95, -2.34], 0.3), color: '#e9c46a', rough: 0.8, metal: 0 },
      { mesh: box(0.42, 0.56, 0.05, [0.36, 0.95, -2.42], 0.3), color: '#5d8fd0', rough: 0.8, metal: 0 },
    ],
  },
]

/** Things that need the rack to sit on */
export const needsRack = new Set(['surf', 'kayak', 'traction'])
