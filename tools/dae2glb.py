"""
Converts the client's COLLADA Jeep (Assimp export + PBR texture set) into one compact .glb.

  python3 tools/dae2glb.py <model.dae> <textures dir> public/models/jeep.glb

  Needs numpy and Pillow. Source: 3dModel/jeep-rubicon (model.zip + textures).

What it does
- bakes node transforms, converts centimetres to metres, centres the car and sits it on y = 0
- regroups meshes into named parts the site animates: body, top, top_front, glass, four wheels, the rest
- drops the red body albedo (paint colour is set at runtime) and packs AO/roughness/metal into one map
- downsizes textures to 1024 px
"""
import sys, json, struct, io, re
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

NS = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}
dae, texdir, out = sys.argv[1:4]
TEX = 1024

root = ET.parse(dae).getroot()
unit = float(root.find('c:asset/c:unit', NS).get('meter', '1'))

def floats(el): return np.array(el.text.split(), dtype=np.float64)

geoms = {}
for g in root.findall('c:library_geometries/c:geometry', NS):
    mesh = g.find('c:mesh', NS)
    src = {}
    for s in mesh.findall('c:source', NS):
        acc = s.find('c:technique_common/c:accessor', NS)
        stride = int(acc.get('stride'))
        src['#' + s.get('id')] = floats(s.find('c:float_array', NS)).reshape(-1, stride)
    vmap = {'#' + v.get('id'): v.find("c:input[@semantic='POSITION']", NS).get('source') for v in mesh.findall('c:vertices', NS)}
    pl = mesh.find('c:polylist', NS)
    inputs = {i.get('semantic'): i.get('source') for i in pl.findall('c:input', NS)}
    pos = src[vmap[inputs['VERTEX']]]
    nrm = src[inputs['NORMAL']]
    uv = src[inputs['TEXCOORD']][:, :2]
    vcount = np.array(pl.find('c:vcount', NS).text.split(), dtype=np.int64)
    p = np.array(pl.find('c:p', NS).text.split(), dtype=np.int64)
    tris = []
    k = 0
    for n in vcount:
        for j in range(1, n - 1):
            tris.append((p[k], p[k + j], p[k + j + 1]))
        k += n
    geoms['#' + g.get('id')] = (pos, nrm, uv, np.array(tris, dtype=np.int64))

parts = []  # (node name, material, world pos, world normal, uv, tris)
def walk(node, parent):
    m = parent
    mat = node.find('c:matrix', NS)
    if mat is not None:
        m = parent @ floats(mat).reshape(4, 4)
    for ig in node.findall('c:instance_geometry', NS):
        pos, nrm, uv, tris = geoms[ig.get('url')]
        material = ig.find('.//c:instance_material', NS).get('target').lstrip('#')
        wp = (np.c_[pos, np.ones(len(pos))] @ m.T)[:, :3] * unit
        nm = np.linalg.inv(m[:3, :3]).T
        wn = nrm @ nm.T
        wn /= np.maximum(np.linalg.norm(wn, axis=1, keepdims=True), 1e-9)
        if np.linalg.det(m[:3, :3]) < 0: tris = tris[:, ::-1]
        parts.append((node.get('name'), material, wp, wn, uv, tris))
    for c in node.findall('c:node', NS):
        walk(c, m)
for vs in root.findall('c:library_visual_scenes/c:visual_scene', NS):
    for n in vs.findall('c:node', NS):
        walk(n, np.eye(4))

allp = np.vstack([p[2] for p in parts])
lo, hi = allp.min(0), allp.max(0)
print('bbox (m)', lo.round(3), hi.round(3), 'size', (hi - lo).round(3))
for name, material, wp, *_ in parts:
    print(f'  {name:32s} {material:28s} c={wp.mean(0).round(2)} min={wp.min(0).round(2)} max={wp.max(0).round(2)}')


# ---------- normalise: 4.2 m long, centred, wheels on the ground ----------
scale = 4.2 / (hi[2] - lo[2])
offset = np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])
parts = [(n, m, (wp - offset) * scale, wn, uv, t) for n, m, wp, wn, uv, t in parts]
if '--inspect' in sys.argv:
    allp = np.vstack([p[2] for p in parts]); print('NORMALISED bbox', allp.min(0).round(3), allp.max(0).round(3))
    for n, m, wp, wn, uv, t in parts:
        if m.startswith('jeeptop') or m in ('Body', 'windows') or n in ('pCylinder4','pCylinder5','polySurface637'):
            print(f'  {n:28s} {m:26s} min={wp.min(0).round(2)} max={wp.max(0).round(2)} tris={len(t)}')
    top = [p for p in parts if p[1].startswith('jeeptop')]
    for n, m, wp, wn, uv, t in top:
        c = wp[t].mean(1)
        h = np.histogram(c[:, 2], bins=12)
        print(n, 'centroid z hist', h[0].tolist(), h[1].round(2).tolist())
        print(n, 'centroid y hist', np.histogram(c[:, 1], bins=8)[0].tolist(), np.histogram(c[:, 1], bins=8)[1].round(2).tolist())
    sys.exit()

WHEELS = {'RightFrontWheel': 'wheel_fr', 'RightRearWheel': 'wheel_rr', 'LeftFrontWheel': 'wheel_fl', 'LeftRearWheel': 'wheel_rl'}
def group_of(name, material):
    if name in WHEELS: return WHEELS[name]
    if name == 'polySurface703': return 'top_front'  # the panel over the front seats: lifts off
    if material.startswith('jeeptop'): return 'top'
    if material == 'Body': return 'body'
    if material == 'windows': return 'glass'
    if material == 'under': return 'under'
    if material.startswith('chair'): return 'seats'
    return 'trim'

# ---------- textures ----------
def load(name, mode='RGB'):
    return Image.open(f'{texdir}/{name}').convert(mode).resize((TEX, TEX), Image.LANCZOS)
def flat(v): return Image.new('L', (TEX, TEX), int(v * 255))
def orm(ao, rough, metal):
    return Image.merge('RGB', [x if isinstance(x, Image.Image) else flat(x) for x in (ao, rough, metal)])
def enc(im, fmt='JPEG', q=82):
    b = io.BytesIO()
    im.save(b, fmt, quality=q) if fmt == 'JPEG' else im.save(b, fmt, optimize=True)
    return b.getvalue(), ('image/jpeg' if fmt == 'JPEG' else 'image/png')

images, textures = [], []
def tex(im, fmt='JPEG', q=82):
    data, mime = enc(im, fmt, q)
    images.append((data, mime))
    textures.append({'source': len(images) - 1, 'sampler': 0})
    return {'index': len(textures) - 1}

L = lambda n: load(n, 'L')
glass = Image.merge('LA', [flat(0.04), L('windows_opacity.jpeg')]).resize((512, 512))
materials = {
    # Paint: colour comes from the site at runtime, so there is no albedo map.
    'Body': dict(pbr=dict(baseColorFactor=[0.76, 0.25, 0.23, 1], metallicRoughnessTexture=tex(orm(L('Body_AO.jpeg'), L('Body_roughness.jpeg'), L('Body_metallic.jpeg')))),
                 normalTexture=tex(load('Body_normal.png'), q=90), occ=True),
    'Wheel': dict(pbr=dict(baseColorTexture=tex(load('Wheel_albedo.jpeg')), metallicRoughnessTexture=tex(orm(L('Wheel_AO.jpeg'), L('Wheel_roughness.jpeg'), L('Wheel_metallic.jpeg')))),
                  normalTexture=tex(load('Wheel_normal.png'), q=88), occ=True),
    'jeepbump_lambert11SG1': dict(pbr=dict(baseColorFactor=[0.035, 0.037, 0.04, 1], metallicRoughnessTexture=tex(orm(L('jeepbump_lambert11SG1_AO.jpeg'), L('jeepbump_lambert11SG1_roughness.jpeg'), 0.0))), occ=True),
    'jeeptop_low_lambert13SG1': dict(pbr=dict(baseColorFactor=[0.045, 0.047, 0.05, 1], metallicRoughnessTexture=tex(orm(L('jeeptop_low_lambert13SG1_AO.jpeg'), 0.85, 0.0))), occ=True),
    'Detail_lights_Lights1': dict(pbr=dict(baseColorTexture=tex(load('Detail_lights_Lights1_albedo.jpeg')), metallicRoughnessTexture=tex(orm(L('Detail_lights_Lights1_AO.jpeg'), 0.25, 0.0))),
                                  emissiveTexture=tex(load('Detail_lights_Lights1_emissive.jpeg').resize((512, 512))), emissiveFactor=[1, 1, 1], occ=True),
    'Lights_Lights1': dict(pbr=dict(baseColorTexture=tex(load('Lights_Lights1_albedo.jpeg').resize((512, 512))), roughnessFactor=0.3, metallicFactor=0.0)),
    'under': dict(pbr=dict(baseColorFactor=[0.03, 0.03, 0.035, 1], metallicRoughnessTexture=tex(orm(L('under_AO.jpeg'), 1.0, 0.0))), occ=True),
    'windows': dict(pbr=dict(baseColorTexture=tex(glass, 'PNG'), roughnessFactor=0.05, metallicFactor=0.0), alphaMode='BLEND'),
    'chair_lambert2SG1': dict(pbr=dict(baseColorFactor=[0.42, 0.24, 0.12, 1], roughnessFactor=0.7, metallicFactor=0.0)),  # saddle leather
    'inside': dict(pbr=dict(baseColorFactor=[0.03, 0.032, 0.035, 1], roughnessFactor=0.6, metallicFactor=0.0)),
    'small_detail_lambert16SG1': dict(pbr=dict(baseColorFactor=[0.03, 0.03, 0.033, 1], roughnessFactor=0.75, metallicFactor=0.3)),
    'Detail_parts': dict(pbr=dict(baseColorFactor=[0.5, 0.5, 0.5, 1], roughnessFactor=0.3, metallicFactor=0.6)),
    'Default_Material': dict(pbr=dict(baseColorFactor=[0.03, 0.03, 0.033, 1], roughnessFactor=0.9, metallicFactor=0.0)),
    'lambert1': dict(pbr=dict(baseColorFactor=[0.2, 0.2, 0.2, 1], roughnessFactor=0.6, metallicFactor=0.0)),
}
mat_index = {n: i for i, n in enumerate(materials)}
gl_materials = []
for name, m in materials.items():
    g = {'name': name, 'pbrMetallicRoughness': m['pbr']}
    for k in ('normalTexture', 'emissiveTexture', 'emissiveFactor', 'alphaMode'):
        if k in m: g[k] = m[k]
    if m.get('occ'): g['occlusionTexture'] = m['pbr']['metallicRoughnessTexture']
    gl_materials.append(g)

# ---------- geometry ----------
merged = {}  # (group, material) -> lists
for name, material, wp, wn, uv, tris in parts:
    key = (group_of(name, material), material)
    e = merged.setdefault(key, dict(pos=[], nrm=[], uv=[], idx=[], n=0))
    e['pos'].append(wp); e['nrm'].append(wn); e['uv'].append(np.c_[uv[:, 0], 1 - uv[:, 1]]); e['idx'].append(tris + e['n']); e['n'] += len(wp)

bin_ = bytearray()
views, accessors = [], []
def view(data, target=None):
    while len(bin_) % 4: bin_.append(0)
    v = {'buffer': 0, 'byteOffset': len(bin_), 'byteLength': len(data)}
    if target: v['target'] = target
    bin_.extend(data); views.append(v); return len(views) - 1
def accessor(arr, ctype, typ, target, minmax=False):
    a = {'bufferView': view(arr.tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accessors.append(a); return len(accessors) - 1

groups = {}
for (group, material), e in merged.items():
    groups.setdefault(group, []).append((material, np.vstack(e['pos']), np.vstack(e['nrm']), np.vstack(e['uv']), np.vstack(e['idx'])))

nodes, meshes = [], []
for group, prims in groups.items():
    pivot = np.zeros(3)
    if group.startswith('wheel_'):
        allv = np.vstack([p[1] for p in prims]); pivot = (allv.min(0) + allv.max(0)) / 2
    gp = []
    for material, pos, nrm, uv, idx in prims:
        pos = (pos - pivot).astype(np.float32)
        ia = idx.astype(np.uint16 if len(pos) < 65536 else np.uint32).reshape(-1)
        gp.append({'attributes': {'POSITION': accessor(pos, 5126, 'VEC3', 34962, True), 'NORMAL': accessor(nrm.astype(np.float32), 5126, 'VEC3', 34962), 'TEXCOORD_0': accessor(uv.astype(np.float32), 5126, 'VEC2', 34962)},
                   'indices': accessor(ia, 5123 if ia.dtype == np.uint16 else 5125, 'SCALAR', 34963), 'material': mat_index[material]})
    meshes.append({'name': group, 'primitives': gp})
    node = {'name': group, 'mesh': len(meshes) - 1}
    if pivot.any(): node['translation'] = [round(float(x), 5) for x in pivot]
    nodes.append(node)
    print(f'  node {group:9s} prims={len(gp)} tris={sum(len(p[4]) for p in prims)} pivot={pivot.round(3)}')

gl_images = []
for data, mime in images:
    gl_images.append({'bufferView': view(data), 'mimeType': mime})

gltf = {'asset': {'version': '2.0', 'generator': 'dae2glb.py'}, 'scene': 0, 'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes, 'meshes': meshes, 'materials': gl_materials, 'textures': textures, 'images': gl_images,
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
        'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': len(bin_)}]}
js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
while len(bin_) % 4: bin_.append(0)
with open(out, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
    f.write(struct.pack('<I4s', len(bin_), b'BIN\0')); f.write(bin_)
print('wrote', out, round((12 + 16 + len(js) + len(bin_)) / 1e6, 2), 'MB; images', round(sum(len(d) for d, _ in images) / 1e6, 2), 'MB')
