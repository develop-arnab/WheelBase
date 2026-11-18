/* Column-major 4×4 matrices, just enough for one camera and a handful of nodes. */
export type Mat4 = Float32Array
export type Vec3 = [number, number, number]

export const mat4 = () => {
  const m = new Float32Array(16)
  m[0] = m[5] = m[10] = m[15] = 1
  return m
}

export function multiply(a: Mat4, b: Mat4, out: Mat4 = new Float32Array(16)) {
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]
      out[c * 4 + r] = s
    }
  return out
}

export function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2)
  const m = new Float32Array(16)
  m[0] = f / aspect
  m[5] = f
  m[10] = (far + near) / (near - far)
  m[11] = -1
  m[14] = (2 * far * near) / (near - far)
  return m
}

export function ortho(l: number, r: number, b: number, t: number, n: number, f: number) {
  const m = mat4()
  m[0] = 2 / (r - l)
  m[5] = 2 / (t - b)
  m[10] = -2 / (f - n)
  m[12] = -(r + l) / (r - l)
  m[13] = -(t + b) / (t - b)
  m[14] = -(f + n) / (f - n)
  return m
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]) {
  const z = norm(sub(eye, target))
  const x = norm(cross(up, z))
  const y = cross(z, x)
  const m = mat4()
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2]
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2]
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2]
  m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2])
  m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2])
  m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2])
  return m
}

/** Translation, then a rotation about X (wheel spin), then uniform scale. */
export function compose(t: Vec3, spinX = 0, s = 1) {
  const c = Math.cos(spinX)
  const n = Math.sin(spinX)
  const m = mat4()
  m[0] = s
  m[5] = c * s
  m[6] = n * s
  m[9] = -n * s
  m[10] = c * s
  m[12] = t[0]
  m[13] = t[1]
  m[14] = t[2]
  return m
}

export const normalMatrix = (m: Mat4) =>
  new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]])

/** '#c2413b' → linear RGB */
export function hexToLinear(hex: string): Vec3 {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)]
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
export const easeIn = (t: number) => t * t * t
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
