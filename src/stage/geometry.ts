/* Procedural meshes for the accessories: boxes and ellipsoids, with normals. */
export type Mesh = { position: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint16Array }

export function box(w: number, h: number, d: number, at: [number, number, number] = [0, 0, 0], round = 0): Mesh {
  // Six faces; `round` bevels normals toward the corners for a softer read.
  const [cx, cy, cz] = at
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, -1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, 0, 1], [0, 1, 0], [1, 0, 0]],
    [[0, 0, -1], [0, 1, 0], [-1, 0, 0]],
  ]
  const half = [w / 2, h / 2, d / 2]
  const pos: number[] = []
  const nrm: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (const [n, u, v] of faces) {
    const base = pos.length / 3
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = [0, 1, 2].map((k) => (n[k] + u[k] * su + v[k] * sv) * half[k])
      pos.push(p[0] + cx, p[1] + cy, p[2] + cz)
      const nn = [0, 1, 2].map((k) => n[k] + round * (u[k] * su + v[k] * sv))
      const l = Math.hypot(nn[0], nn[1], nn[2])
      nrm.push(nn[0] / l, nn[1] / l, nn[2] / l)
      uv.push((su + 1) / 2, (sv + 1) / 2)
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return { position: new Float32Array(pos), normal: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint16Array(idx) }
}

export function ellipsoid(rx: number, ry: number, rz: number, at: [number, number, number] = [0, 0, 0], seg = 28, ring = 14, flatBottom = false): Mesh {
  const [cx, cy, cz] = at
  const pos: number[] = []
  const nrm: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= ring; i++) {
    const v = i / ring
    const phi = v * Math.PI
    for (let j = 0; j <= seg; j++) {
      const u = j / seg
      const th = u * Math.PI * 2
      // along z is the long axis
      const x = Math.sin(phi) * Math.cos(th)
      let y = Math.sin(phi) * Math.sin(th)
      const z = Math.cos(phi)
      if (flatBottom && y < 0) y *= 0.35
      pos.push(cx + x * rx, cy + y * ry, cz + z * rz)
      const nx = x / rx
      const ny = y / ry
      const nz = z / rz
      const l = Math.hypot(nx, ny, nz) || 1
      nrm.push(nx / l, ny / l, nz / l)
      uv.push(u, v)
    }
  }
  for (let i = 0; i < ring; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j
      const b = a + seg + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  return { position: new Float32Array(pos), normal: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint16Array(idx) }
}

export function merge(...meshes: Mesh[]): Mesh {
  let vcount = 0
  const pos: number[] = []
  const nrm: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (const m of meshes) {
    pos.push(...m.position)
    nrm.push(...m.normal)
    uv.push(...m.uv)
    for (const i of m.index) idx.push(i + vcount)
    vcount += m.position.length / 3
  }
  return { position: new Float32Array(pos), normal: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint16Array(idx) }
}
