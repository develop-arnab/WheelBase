import { accessories, type Accessory } from './accessories'
import type { Mesh } from './geometry'
import { parseGlb, type GlbMaterial } from './glb'
import {
  clamp, compose, easeIn, easeInOut, easeOut, easeOutBack, hexToLinear, lerp, lookAt, mat4, multiply,
  normalMatrix, perspective, type Mat4, type Vec3,
} from './math'
import { BAKE_FRAG, FRAG, GROUND_FRAG, GROUND_VERT, VERT } from './shaders'

/*
  The Jeep viewer. Dependency-free WebGL2, written for one model and one job.

  It only draws when something changes (a drag, a tween, a paint sweep), so an
  idle page costs nothing. React talks to it through the small public API at
  the bottom of the class; nothing else reaches into it.
*/

export type View = 'hero' | 'pick' | 'kit' | 'front' | 'side' | 'rear' | 'above'
export type RoofType = 'sky' | 'hardtop'

type Draw = {
  vao: WebGLVertexArrayObject
  count: number
  type: number
  mat: Material
}
type Material = {
  name: string
  base: [number, number, number, number]
  metal: number
  rough: number
  emissive: Vec3
  clear: number
  baseTex?: WebGLTexture
  ormTex?: WebGLTexture
  occ: boolean
  normTex?: WebGLTexture
  emTex?: WebGLTexture
  blend: boolean
}
type Node = { name: string; pivot: Vec3; draws: Draw[] }
type LiveAccessory = { def: Accessory; draws: Draw[]; t: number; dir: 1 | -1 }

const FOV = (26 * Math.PI) / 180

const VIEWS: Record<View, { yaw: number; pitch: number; zoom: number; ty: number }> = {
  hero: { yaw: 0.86, pitch: 0.03, zoom: 1, ty: 1.22 },
  pick: { yaw: 0.92, pitch: 0.12, zoom: 1, ty: 0.92 },
  kit: { yaw: 2.42, pitch: 0.2, zoom: 1.04, ty: 1.15 },
  front: { yaw: 0.32, pitch: 0.08, zoom: 0.96, ty: 0.92 },
  side: { yaw: Math.PI / 2, pitch: 0.05, zoom: 0.98, ty: 0.92 },
  rear: { yaw: 2.75, pitch: 0.14, zoom: 0.98, ty: 0.98 },
  above: { yaw: 1.2, pitch: 0.95, zoom: 1.05, ty: 0.7 },
}
const WHEEL_R = 0.416
const SHADOW_RECT: [number, number, number, number] = [-1.7, -3.1, 3.4, 6.2]
const GROUND_R = 5.2
const BLACK_TOP: Vec3 = [0.008, 0.009, 0.01]

export class JeepRenderer {
  private gl: WebGL2RenderingContext
  private prog: WebGLProgram
  private groundProg: WebGLProgram
  private bakeProg: WebGLProgram
  private u = new Map<string, WebGLUniformLocation | null>()
  private nodes: Node[] = []
  private groundVao: WebGLVertexArrayObject
  private shadowTex: WebGLTexture
  private shadowFbo: WebGLFramebuffer
  private shadowDirty = true

  // camera
  private yaw = VIEWS.hero.yaw
  private pitch = VIEWS.hero.pitch
  private zoom = 1
  private ty = VIEWS.hero.ty
  private vel = 0
  private camTween: { from: typeof VIEWS.hero; to: typeof VIEWS.hero; t: number; dur: number } | null = null
  private autoRotate = false
  /** horizontal lens shift in clip space: positive puts the Jeep right of centre */
  private shift = 0
  private shiftTween: { from: number; to: number; zFrom: number; zTo: number; lFrom: number; lTo: number; t: number } | null = null
  private zoomBias = 1
  /** metres added to the camera's aim height: positive sits the Jeep lower in the frame */
  private lift = 0
  /** reports where the horizon falls, as a fraction of the canvas height from the top */
  private horizonCb?: (y: number) => void
  private lastHorizon = -1
  get onHorizon() {
    return this.horizonCb
  }
  /** Setting a listener reports the current horizon straight away, so the page never waits for a redraw. */
  set onHorizon(fn: ((y: number) => void) | undefined) {
    this.horizonCb = fn
    this.lastHorizon = JeepRenderer.horizonAt(this.pitch)
    fn?.(this.lastHorizon)
  }
  static horizonAt(pitch: number) {
    return clamp((1 - Math.tan(pitch) / Math.tan(FOV / 2)) / 2, -0.5, 1.5)
  }
  private dragging = false
  private lastX = 0
  private lastY = 0
  private lastMoveT = 0

  // car state
  private paintTo: Vec3 = hexToLinear('#c2413b')
  private paintFrom: Vec3 = this.paintTo
  private topTo: Vec3 = BLACK_TOP
  private topFrom: Vec3 = BLACK_TOP
  private sweepT = 1
  private roofType: RoofType = 'sky'
  private roofOpenTarget = 0
  private roofOpen = 0
  private live = new Map<string, LiveAccessory>()
  private accCache = new Map<string, Draw[]>()
  private carZ = 0
  private wheelSpin = 0
  private drive: { from: number; to: number; t: number; dur: number; ease: (t: number) => number; done: () => void } | null = null

  private raf = 0
  private last = 0
  private visible = true
  private disposed = false
  private reduced = false
  private ro: ResizeObserver
  private io: IntersectionObserver
  ready = false
  onInteract?: () => void

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gl.getExtension('EXT_texture_filter_anisotropic')

    this.prog = this.program(VERT, FRAG)
    this.groundProg = this.program(GROUND_VERT, GROUND_FRAG)
    this.bakeProg = this.program(VERT, BAKE_FRAG)

    // ground disc as a unit quad
    this.groundVao = gl.createVertexArray()!
    gl.bindVertexArray(this.groundVao)
    const gb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, gb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // baked floor shadow
    this.shadowTex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 192, 352, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.shadowFbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    this.ro = new ResizeObserver(() => this.invalidate())
    this.ro.observe(canvas)
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting
      if (this.visible) this.invalidate()
    })
    this.io.observe(canvas)
    document.addEventListener('visibilitychange', this.onVisibility)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('webglcontextlost', this.onLost)
  }

  /* ---------------- loading ---------------- */

  async load(url: string) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Model request failed (${res.status})`)
    const glb = parseGlb(await res.arrayBuffer())
    if (this.disposed) throw new Error('Renderer was disposed while loading')
    const gl = this.gl

    const srgb = new Set<number>()
    glb.materials.forEach((m) => {
      if (m.baseTex !== undefined) srgb.add(m.baseTex)
      if (m.emissiveTex !== undefined) srgb.add(m.emissiveTex)
    })
    const textures = await Promise.all(
      glb.textures.map(async (img, i) => {
        const { bytes, mime } = glb.images[img]
        const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }), {
          imageOrientation: 'none',
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none',
        })
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, srgb.has(i) ? gl.SRGB8_ALPHA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        const ext = gl.getExtension('EXT_texture_filter_anisotropic')
        if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4)
        bmp.close()
        return t
      }),
    )
    const materials = glb.materials.map((m) => this.material(m, textures))
    this.nodes = glb.nodes.map((n) => ({
      name: n.name,
      pivot: n.translation,
      draws: n.primitives.map((p) => ({ ...this.upload(p), mat: materials[p.material] })),
    }))
    if (this.disposed) throw new Error('Renderer was disposed while loading')
    this.ready = true
    this.shadowDirty = true
    this.invalidate()
  }

  private material(m: GlbMaterial, tex: WebGLTexture[]): Material {
    if (m.name === 'windows') {
      // the source opacity map is smudged; clean tinted glass reads better
      return { name: m.name, base: [0.012, 0.016, 0.02, 0.58], metal: 0, rough: 0.04, emissive: [0, 0, 0], clear: 0, occ: false, blend: true }
    }
    return {
      name: m.name,
      base: [...m.baseColor] as Material['base'],
      // the source paint is ~⅔ metallic, which washes colour out under studio
      // light; a coloured base coat under a clear coat reads truer
      metal: m.name === 'Body' ? m.metallic * 0.22 : m.metallic,
      rough: m.name === 'Body' ? m.roughness * 2.4 : m.roughness,
      emissive: [m.emissive[0] * 0.55, m.emissive[1] * 0.55, m.emissive[2] * 0.55],
      clear: m.name === 'Body' ? 1 : 0,
      baseTex: m.baseTex !== undefined ? tex[m.baseTex] : undefined,
      ormTex: m.ormTex !== undefined ? tex[m.ormTex] : undefined,
      occ: m.occlusion,
      normTex: m.normalTex !== undefined ? tex[m.normalTex] : undefined,
      emTex: m.emissiveTex !== undefined ? tex[m.emissiveTex] : undefined,
      blend: m.blend,
    }
  }

  private upload(p: { position: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint16Array | Uint32Array }) {
    const gl = this.gl
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const attr = (loc: number, data: Float32Array, size: number) => {
      const b = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    }
    attr(0, p.position, 3)
    attr(1, p.normal, 3)
    attr(2, p.uv, 2)
    const ib = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.index, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return { vao, count: p.index.length, type: p.index instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT }
  }

  private program(vs: string, fs: string) {
    const gl = this.gl
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error')
    return p
  }

  private loc(p: WebGLProgram, name: string) {
    const key = `${p === this.prog ? 'm' : p === this.groundProg ? 'g' : 'b'}:${name}`
    if (!this.u.has(key)) this.u.set(key, this.gl.getUniformLocation(p, name))
    return this.u.get(key)!
  }

  /* ---------------- input ---------------- */

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    this.dragging = true
    this.camTween = null
    this.autoRotate = false
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.lastMoveT = performance.now()
    this.vel = 0
    this.canvas.setPointerCapture(e.pointerId)
    this.canvas.addEventListener('pointermove', this.onMove)
    this.canvas.addEventListener('pointerup', this.onUp)
    this.canvas.addEventListener('pointercancel', this.onUp)
    this.onInteract?.()
  }
  private onMove = (e: PointerEvent) => {
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    const now = performance.now()
    const d = -dx * 0.0085
    this.yaw += d
    if (e.pointerType === 'mouse') this.pitch = clamp(this.pitch + dy * 0.004, 0.02, 0.62)
    this.vel = d / Math.max(8, now - this.lastMoveT)
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.lastMoveT = now
    this.invalidate()
  }
  private onUp = (e: PointerEvent) => {
    this.dragging = false
    if (performance.now() - this.lastMoveT > 80) this.vel = 0
    this.canvas.releasePointerCapture?.(e.pointerId)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onUp)
    this.invalidate()
  }
  private onVisibility = () => {
    if (!document.hidden) this.invalidate()
  }
  private onLost = (e: Event) => {
    e.preventDefault()
    this.ready = false
  }

  /* ---------------- frame loop ---------------- */

  invalidate() {
    if (this.raf || this.disposed) return
    this.raf = requestAnimationFrame(this.frame)
  }

  private frame = (now: number) => {
    this.raf = 0
    if (!this.visible || document.hidden || this.disposed) {
      this.last = 0
      return
    }
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60
    this.last = now
    const busy = this.step(dt)
    this.render()
    if (busy) this.invalidate()
    else this.last = 0
  }

  /** Advances every animation. Returns true while anything is still moving. */
  private step(dt: number) {
    let busy = this.dragging

    if (this.camTween) {
      const tw = this.camTween
      tw.t = Math.min(1, tw.t + dt / tw.dur)
      const k = easeInOut(tw.t)
      let dy = tw.to.yaw - tw.from.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      this.yaw = tw.from.yaw + dy * k
      this.pitch = lerp(tw.from.pitch, tw.to.pitch, k)
      this.zoom = lerp(tw.from.zoom, tw.to.zoom, k)
      this.ty = lerp(tw.from.ty, tw.to.ty, k)
      if (tw.t >= 1) this.camTween = null
      busy = true
    } else if (!this.dragging && Math.abs(this.vel) > 0.00002) {
      this.yaw += this.vel * dt * 1000
      this.vel *= Math.pow(0.0025, dt)
      busy = true
    } else if (this.autoRotate && !this.reduced) {
      this.yaw += dt * 0.16
      busy = true
    }

    if (this.shiftTween) {
      const st = this.shiftTween
      st.t = Math.min(1, st.t + dt / 0.9)
      this.shift = lerp(st.from, st.to, easeInOut(st.t))
      this.zoomBias = lerp(st.zFrom, st.zTo, easeInOut(st.t))
      this.lift = lerp(st.lFrom, st.lTo, easeInOut(st.t))
      if (st.t >= 1) this.shiftTween = null
      busy = true
    }

    if (this.sweepT < 1) {
      this.sweepT = Math.min(1, this.sweepT + dt / 0.95)
      busy = true
    }

    if (this.roofOpen !== this.roofOpenTarget) {
      const d = dt / 0.75
      this.roofOpen = this.roofOpenTarget > this.roofOpen ? Math.min(this.roofOpenTarget, this.roofOpen + d) : Math.max(this.roofOpenTarget, this.roofOpen - d)
      if (this.roofOpen === this.roofOpenTarget) this.shadowDirty = true
      busy = true
    }

    for (const [id, a] of this.live) {
      a.t = clamp(a.t + (a.dir * dt) / (a.dir > 0 ? 0.7 : 0.28))
      if (a.dir < 0 && a.t <= 0) this.live.delete(id)
      if ((a.dir > 0 && a.t < 1) || (a.dir < 0 && a.t > 0)) busy = true
      else this.shadowDirty = true
    }

    if (this.drive) {
      const dr = this.drive
      dr.t = Math.min(1, dr.t + dt / dr.dur)
      const z = lerp(dr.from, dr.to, dr.ease(dr.t))
      this.wheelSpin += (z - this.carZ) / WHEEL_R
      this.carZ = z
      if (dr.t >= 1) {
        this.drive = null
        dr.done()
      }
      busy = true
    }
    return busy
  }

  private camera() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const scale = Math.min(dpr, Math.sqrt(2_600_000 / Math.max(1, w * h)))
    const cw = Math.max(1, Math.round(w * scale))
    const ch = Math.max(1, Math.round(h * scale))
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw
      this.canvas.height = ch
    }
    const aspect = w / Math.max(1, h)
    const fov = FOV
    // frame the car's bounding sphere, whichever way the canvas is shaped
    const radius = 2.55
    const fit = radius / (Math.tan(fov / 2) * Math.min(1, aspect))
    const dist = fit * 1.02 * this.zoom * this.zoomBias
    const target: Vec3 = [0, this.ty + this.lift, -0.15]
    const eye: Vec3 = [
      target[0] + dist * Math.sin(this.yaw) * Math.cos(this.pitch),
      target[1] + dist * Math.sin(this.pitch),
      target[2] + dist * Math.cos(this.yaw) * Math.cos(this.pitch),
    ]
    const proj = perspective(fov, aspect, 0.5, 80)
    proj[8] -= this.shift
    const viewProj = multiply(proj, lookAt(eye, target))
    // where the ground plane meets the sky, so the page's scenery can line up
    const horizon = JeepRenderer.horizonAt(this.pitch)
    if (Math.abs(horizon - this.lastHorizon) > 0.0005) {
      this.lastHorizon = horizon
      this.horizonCb?.(horizon)
    }
    return { eye, viewProj }
  }

  /* ---------------- drawing ---------------- */

  private nodeMatrix(n: Node, carZ: number): { m: Mat4; opacity: number } {
    let [x, y, z] = n.pivot
    let spin = 0
    let opacity = 1
    if (n.name.startsWith('wheel_')) spin = this.wheelSpin
    if (n.name === 'top_front') {
      const p = this.roofOpen
      // slides back over the rear roof, like the power top folding away
      y += easeOut(clamp(p * 1.6)) * 0.085
      z -= easeInOut(p) * 0.62
      opacity = 1 - clamp((p - 0.4) / 0.6)
    }
    return { m: compose([x, y, z + carZ], spin), opacity }
  }

  private render() {
    const gl = this.gl
    if (this.ready && this.shadowDirty) this.bakeShadow()
    const { eye, viewProj } = this.camera()
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    if (!this.ready) return

    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // floor shadow
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.useProgram(this.groundProg)
    gl.uniformMatrix4fv(this.loc(this.groundProg, 'uViewProj'), false, viewProj)
    gl.uniform1f(this.loc(this.groundProg, 'uRadius'), GROUND_R)
    gl.uniform4f(this.loc(this.groundProg, 'uRect'), SHADOW_RECT[0], SHADOW_RECT[1] + this.carZ, SHADOW_RECT[2], SHADOW_RECT[3])
    gl.uniform1f(this.loc(this.groundProg, 'uStrength'), 1 - clamp((Math.abs(this.carZ) - 2.5) / 3))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex)
    gl.uniform1i(this.loc(this.groundProg, 'tShadow'), 0)
    gl.bindVertexArray(this.groundVao)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // car
    gl.useProgram(this.prog)
    const p = this.prog
    gl.uniformMatrix4fv(this.loc(p, 'uViewProj'), false, viewProj)
    gl.uniform3f(this.loc(p, 'uCam'), eye[0], eye[1], eye[2])
    gl.uniform1f(this.loc(p, 'uExposure'), 0.94)
    gl.uniform1f(this.loc(p, 'uBodyOffsetZ'), this.carZ)
    const sweep = this.sweepT >= 1 ? -10 : lerp(2.35, -2.95, easeInOut(this.sweepT))
    gl.uniform1f(this.loc(p, 'uSweep'), sweep)
    gl.uniform1i(this.loc(p, 'tBase'), 0)
    gl.uniform1i(this.loc(p, 'tOrm'), 1)
    gl.uniform1i(this.loc(p, 'tNorm'), 2)
    gl.uniform1i(this.loc(p, 'tEm'), 3)

    type Item = { d: Draw; m: Mat4; opacity: number; node: string }
    const opaque: Item[] = []
    const blended: Item[] = []
    for (const n of this.nodes) {
      const { m, opacity } = this.nodeMatrix(n, this.carZ)
      if (opacity <= 0.001) continue
      for (const d of n.draws) (d.mat.blend || opacity < 1 ? blended : opaque).push({ d, m, opacity, node: n.name })
    }
    for (const a of this.live.values()) {
      const t = a.t
      const drop = a.dir > 0 ? (1 - easeOutBack(t)) * 1.1 : (1 - t) * 0.35
      const m = compose([0, drop, this.carZ])
      const opacity = a.dir > 0 ? clamp(t * 4) : t
      for (const d of a.draws) (opacity < 1 ? blended : opaque).push({ d, m, opacity, node: 'acc' })
    }

    gl.depthMask(true)
    for (const it of opaque) this.drawItem(it.d, it.m, it.opacity, it.node)
    gl.depthMask(false)
    for (const it of blended) this.drawItem(it.d, it.m, it.opacity, it.node)
    gl.depthMask(true)
    gl.bindVertexArray(null)
  }

  private drawItem(d: Draw, m: Mat4, opacity: number, node: string) {
    const gl = this.gl
    const p = this.prog
    const mat = d.mat
    gl.uniformMatrix4fv(this.loc(p, 'uModel'), false, m)
    gl.uniformMatrix3fv(this.loc(p, 'uNormalMat'), false, normalMatrix(m))

    const isBody = mat.name === 'Body'
    const isTop = node === 'top' || node === 'top_front'
    const painted = isBody || (isTop && this.roofType === 'hardtop')
    let base = mat.base
    let rough = mat.rough
    let clear = mat.clear
    let metal = mat.metal
    gl.uniform1i(this.loc(p, 'uPaint'), isBody || isTop ? 1 : 0)
    if (isBody) {
      base = [...this.paintTo, 1]
      gl.uniform3fv(this.loc(p, 'uPaintFrom'), this.paintFrom)
    } else if (isTop) {
      base = [...this.topTo, 1]
      gl.uniform3fv(this.loc(p, 'uPaintFrom'), this.topFrom)
      if (painted) {
        rough = 0.32
        clear = 0.8
        metal = 0.15
      }
    }
    gl.uniform4f(this.loc(p, 'uBase'), base[0], base[1], base[2], base[3])
    gl.uniform1f(this.loc(p, 'uMetal'), metal)
    gl.uniform1f(this.loc(p, 'uRough'), rough)
    gl.uniform1f(this.loc(p, 'uClear'), clear)
    gl.uniform3fv(this.loc(p, 'uEmissive'), mat.emissive)
    gl.uniform1f(this.loc(p, 'uOpacity'), opacity)

    const bind = (unit: number, t: WebGLTexture | undefined, flag: string) => {
      gl.uniform1i(this.loc(p, flag), t ? 1 : 0)
      if (t) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, t)
      }
    }
    bind(0, mat.baseTex, 'uHasBase')
    bind(1, mat.ormTex, 'uHasOrm')
    gl.uniform1i(this.loc(p, 'uHasOcc'), mat.occ ? 1 : 0)
    bind(2, mat.normTex, 'uHasNorm')
    bind(3, mat.emTex, 'uHasEm')

    gl.bindVertexArray(d.vao)
    gl.drawElements(gl.TRIANGLES, d.count, d.type, 0)
  }

  /** Top-down silhouette of the car, blurred later by the floor shader. */
  private bakeShadow() {
    const gl = this.gl
    this.shadowDirty = false
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo)
    gl.viewport(0, 0, 192, 352)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.MAX)
    gl.useProgram(this.bakeProg)
    const [x0, z0, sx, sz] = SHADOW_RECT
    const proj = new Float32Array([2 / sx, 0, 0, 0, 0, 0, 0, 0, 0, 2 / sz, 0, 0, -((2 * x0) / sx + 1), -((2 * z0) / sz + 1), 0, 1])
    gl.uniformMatrix4fv(this.loc(this.bakeProg, 'uViewProj'), false, proj)
    const draw = (d: Draw, m: Mat4) => {
      gl.uniformMatrix4fv(this.loc(this.bakeProg, 'uModel'), false, m)
      gl.uniformMatrix3fv(this.loc(this.bakeProg, 'uNormalMat'), false, normalMatrix(m))
      gl.bindVertexArray(d.vao)
      gl.drawElements(gl.TRIANGLES, d.count, d.type, 0)
    }
    for (const n of this.nodes) {
      if (n.name === 'glass') continue
      const { m, opacity } = this.nodeMatrix(n, 0)
      if (opacity < 0.5) continue
      for (const d of n.draws) draw(d, m)
    }
    for (const a of this.live.values()) if (a.dir > 0) for (const d of a.draws) draw(d, mat4())
    gl.blendEquation(gl.FUNC_ADD)
    gl.enable(gl.DEPTH_TEST)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private accessoryDraws(def: Accessory): Draw[] {
    return def.parts.map((part) => {
      const lin = hexToLinear(part.color)
      const mat: Material = {
        name: `acc:${def.id}`,
        base: [lin[0], lin[1], lin[2], 1],
        metal: part.metal,
        rough: part.rough,
        emissive: [0, 0, 0],
        clear: part.clear ?? 0,
        occ: false,
        blend: false,
      }
      return { ...this.upload(part.mesh as Mesh), mat }
    })
  }

  /* ---------------- public API ---------------- */

  setPaint(hex: string, animate = true) {
    const next = hexToLinear(hex)
    if (next.every((v, i) => Math.abs(v - this.paintTo[i]) < 1e-4)) return
    this.paintFrom = this.paintTo
    this.topFrom = this.topTo
    this.paintTo = next
    this.topTo = this.roofType === 'hardtop' ? next : BLACK_TOP
    this.sweepT = animate && !this.reduced ? 0 : 1
    this.invalidate()
  }

  setRoof(type: RoofType, open: boolean, animate = true) {
    if (type !== this.roofType) {
      this.roofType = type
      this.topFrom = this.topTo
      this.paintFrom = this.paintTo
      this.topTo = type === 'hardtop' ? this.paintTo : BLACK_TOP
      this.sweepT = animate && !this.reduced ? 0 : 1
    }
    this.roofOpenTarget = open ? 1 : 0
    if (!animate || this.reduced) this.roofOpen = this.roofOpenTarget
    this.shadowDirty = true
    this.invalidate()
  }

  setAccessories(ids: string[], animate = true) {
    const want = new Set(ids)
    for (const [id, a] of this.live) if (!want.has(id) && a.dir > 0) a.dir = -1
    for (const id of want) {
      const cur = this.live.get(id)
      if (cur) {
        cur.dir = 1
        continue
      }
      const def = accessories.find((a) => a.id === id)
      if (!def) continue
      if (!this.accCache.has(id)) this.accCache.set(id, this.accessoryDraws(def))
      this.live.set(id, { def, draws: this.accCache.get(id)!, t: animate && !this.reduced ? 0 : 1, dir: 1 })
    }
    this.shadowDirty = true
    this.invalidate()
  }

  setView(view: View, animate = true) {
    const to = VIEWS[view]
    if (!animate || this.reduced) {
      this.yaw = to.yaw
      this.pitch = to.pitch
      this.zoom = to.zoom
      this.ty = to.ty
      this.camTween = null
      this.lastHorizon = JeepRenderer.horizonAt(this.pitch)
      this.horizonCb?.(this.lastHorizon)
    } else {
      this.camTween = { from: { yaw: this.yaw, pitch: this.pitch, zoom: this.zoom, ty: this.ty }, to, t: 0, dur: 1.15 }
    }
    this.vel = 0
    this.invalidate()
  }

  /**
    Frames the Jeep: shift moves it sideways (hero on wide screens), zoomBias > 1
    pulls back, lift (metres) sits it lower in a tall frame (hero on phones).
  */
  setFraming(shift: number, zoomBias = 1, lift = 0, animate = true) {
    if (!animate || this.reduced) {
      this.shift = shift
      this.zoomBias = zoomBias
      this.lift = lift
      this.shiftTween = null
    } else if (Math.abs(shift - this.shift) > 1e-3 || Math.abs(zoomBias - this.zoomBias) > 1e-3 || Math.abs(lift - this.lift) > 1e-3) {
      this.shiftTween = { from: this.shift, to: shift, zFrom: this.zoomBias, zTo: zoomBias, lFrom: this.lift, lTo: lift, t: 0 }
    }
    this.invalidate()
  }

  setAutoRotate(on: boolean) {
    this.autoRotate = on
    this.invalidate()
  }

  /** Rolls off toward the nose and out of frame. */
  driveOut() {
    return this.driveTo(9, 1.0, easeIn)
  }

  /** Rolls in from behind and stops on its mark. */
  driveIn() {
    this.carZ = -9
    return this.driveTo(0, 1.25, easeOut)
  }

  private driveTo(z: number, dur: number, ease: (t: number) => number) {
    if (this.reduced) {
      this.carZ = 0
      this.invalidate()
      return Promise.resolve()
    }
    return new Promise<void>((done) => {
      this.drive?.done()
      this.drive = { from: this.carZ, to: z, t: 0, dur, ease, done }
      this.invalidate()
    })
  }

  park() {
    this.drive = null
    this.carZ = 0
    this.invalidate()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.io.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
