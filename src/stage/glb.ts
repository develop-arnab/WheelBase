/*
  A deliberately small glTF 2.0 binary reader: nodes with a translation,
  triangle primitives (POSITION, NORMAL, TEXCOORD_0, indices) and
  metallic-roughness materials. That is everything our Jeep asset uses;
  anything else in a file is ignored.
*/
export type GlbPrimitive = {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
  index: Uint16Array | Uint32Array
  material: number
}

export type GlbMaterial = {
  name: string
  baseColor: [number, number, number, number]
  metallic: number
  roughness: number
  emissive: [number, number, number]
  baseTex?: number
  ormTex?: number
  occlusion: boolean
  normalTex?: number
  emissiveTex?: number
  blend: boolean
}

export type GlbNode = { name: string; translation: [number, number, number]; primitives: GlbPrimitive[] }

export type Glb = {
  nodes: GlbNode[]
  materials: GlbMaterial[]
  images: { bytes: Uint8Array; mime: string }[]
  /** image index for each texture */
  textures: number[]
}

type Json = Record<string, any>

export function parseGlb(buffer: ArrayBuffer): Glb {
  const dv = new DataView(buffer)
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB file')
  let off = 12
  let json: Json | null = null
  let bin: ArrayBuffer | null = null
  while (off < buffer.byteLength) {
    const len = dv.getUint32(off, true)
    const type = dv.getUint32(off + 4, true)
    const start = off + 8
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, len)))
    else if (type === 0x004e4942) bin = buffer.slice(start, start + len)
    off = start + len
  }
  if (!json || !bin) throw new Error('GLB is missing its JSON or binary chunk')
  const j = json
  const b = bin

  const view = (i: number) => {
    const v = j.bufferViews[i]
    return { offset: v.byteOffset ?? 0, length: v.byteLength }
  }
  const accessor = (i: number) => {
    const a = j.accessors[i]
    const v = view(a.bufferView)
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type as string] ?? 1
    const n = a.count * comps
    const o = v.offset + (a.byteOffset ?? 0)
    switch (a.componentType) {
      case 5126: return new Float32Array(b, o, n)
      case 5123: return new Uint16Array(b, o, n)
      case 5125: return new Uint32Array(b, o, n)
      default: throw new Error(`Unsupported accessor type ${a.componentType}`)
    }
  }

  const nodes: GlbNode[] = (j.nodes ?? [])
    .filter((n: Json) => n.mesh !== undefined)
    .map((n: Json) => ({
      name: n.name ?? '',
      translation: n.translation ?? [0, 0, 0],
      primitives: j.meshes[n.mesh].primitives.map((p: Json) => ({
        position: accessor(p.attributes.POSITION) as Float32Array,
        normal: accessor(p.attributes.NORMAL) as Float32Array,
        uv: accessor(p.attributes.TEXCOORD_0) as Float32Array,
        index: accessor(p.indices) as Uint16Array | Uint32Array,
        material: p.material ?? 0,
      })),
    }))

  const materials: GlbMaterial[] = (j.materials ?? []).map((m: Json) => {
    const pbr = m.pbrMetallicRoughness ?? {}
    return {
      name: m.name ?? '',
      baseColor: pbr.baseColorFactor ?? [1, 1, 1, 1],
      metallic: pbr.metallicFactor ?? 1,
      roughness: pbr.roughnessFactor ?? 1,
      emissive: m.emissiveFactor ?? [0, 0, 0],
      baseTex: pbr.baseColorTexture?.index,
      ormTex: pbr.metallicRoughnessTexture?.index,
      occlusion: m.occlusionTexture !== undefined,
      normalTex: m.normalTexture?.index,
      emissiveTex: m.emissiveTexture?.index,
      blend: m.alphaMode === 'BLEND',
    }
  })

  const images = (j.images ?? []).map((im: Json) => {
    const v = view(im.bufferView)
    return { bytes: new Uint8Array(b, v.offset, v.length), mime: im.mimeType }
  })
  const textures = (j.textures ?? []).map((t: Json) => t.source as number)
  return { nodes, materials, images, textures }
}
