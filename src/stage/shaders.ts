/*
  One physically based shader for everything on the car, a shadow-only shader
  for the floor, and a tiny one for baking the floor shadow.

  Lighting is a light studio: a soft overhead box, two side strips and a pale
  floor, evaluated analytically (no environment map to download). Paint gets
  a clear coat. The canvas is transparent; the page supplies the backdrop.
*/
export const VERT = /* glsl */ `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMat;
out vec3 vWorld;
out vec3 vLocal;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vLocal = aPos + uModel[3].xyz;
  vNormal = uNormalMat * aNrm;
  vUv = aUv;
  gl_Position = uViewProj * w;
}`

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vLocal;
in vec3 vNormal;
in vec2 vUv;

uniform vec3 uCam;
uniform vec4 uBase;
uniform float uMetal;
uniform float uRough;
uniform vec3 uEmissive;
uniform float uClear;
uniform float uOpacity;
uniform float uExposure;
uniform float uBodyOffsetZ;

uniform sampler2D tBase;  uniform bool uHasBase;
uniform sampler2D tOrm;   uniform bool uHasOrm;  uniform bool uHasOcc;
uniform sampler2D tNorm;  uniform bool uHasNorm;
uniform sampler2D tEm;    uniform bool uHasEm;

// paint sweep: the new colour washes from the nose to the tail
uniform bool uPaint;
uniform vec3 uPaintFrom;
uniform float uSweep;

out vec4 outColor;

const float PI = 3.14159265;

vec3 studio(vec3 d, float r) {
  float y = d.y;
  vec3 floorC = vec3(0.62, 0.62, 0.6);
  vec3 horizon = vec3(0.86, 0.88, 0.9);
  vec3 ceil = vec3(0.66, 0.7, 0.74);
  vec3 c = y < 0.0 ? mix(horizon, floorC, smoothstep(0.0, 0.25 + r, -y))
                   : mix(horizon, ceil, smoothstep(0.0, 0.45 + r, y));
  float soft = 1.0 - r * 0.75;
  // long softbox overhead, running nose to tail
  float w = 0.03 + r * 0.5;
  float boxA = smoothstep(w, 0.0, abs(d.x) - 0.1) * smoothstep(0.55 - r * 0.4, 0.8, y);
  c += boxA * 1.8 * soft;
  // two side strips
  float strip = smoothstep(0.08 + r * 0.35, 0.0, abs(y - 0.2)) * smoothstep(0.25, 0.85, abs(d.z));
  c += strip * 1.4 * soft;
  // the floor line gives paint its horizon
  c *= 1.0 - 0.45 * smoothstep(0.05 + r * 0.25, 0.0, abs(y + 0.03)) * soft;
  return c;
}

vec3 irradiance(vec3 n) {
  vec3 sky = vec3(1.0, 1.0, 1.0);
  vec3 ground = vec3(0.42, 0.41, 0.4);
  return mix(ground, sky, n.y * 0.5 + 0.5);
}

vec2 envBRDF(float NoV, float r) {
  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 rr = r * c0 + c1;
  float a004 = min(rr.x * rr.x, exp2(-9.28 * NoV)) * rr.x + rr.y;
  return vec2(-1.04, 1.04) * a004 + rr.zw;
}

float D_GGX(float NoH, float a) {
  float a2 = a * a;
  float f = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * f * f);
}

vec3 perturb(vec3 N, vec3 p, vec2 uv, vec3 m) {
  vec3 dp1 = dFdx(p), dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
  vec3 T = dp2p * duv1.x + dp1p * duv2.x;
  vec3 B = dp2p * duv1.y + dp1p * duv2.y;
  float inv = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-12));
  return normalize(mat3(T * inv, B * inv, N) * m);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec4 base = uBase;
  if (uHasBase) {
    vec4 t = texture(tBase, vUv);
    base *= t;
  }
  float edge = 0.0;
  if (uPaint) {
    float z = vLocal.z - uBodyOffsetZ;
    base.rgb = z > uSweep ? base.rgb : uPaintFrom;
    edge = smoothstep(0.16, 0.0, abs(z - uSweep));
  }
  float rough = uRough;
  float metal = uMetal;
  float ao = 1.0;
  if (uHasOrm) {
    vec3 t = texture(tOrm, vUv).rgb;
    rough *= t.g;
    metal *= t.b;
    if (uHasOcc) ao = mix(1.0, t.r, 0.85);
  }
  rough = clamp(rough, 0.04, 1.0);

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  if (uHasNorm) {
    vec3 m = texture(tNorm, vUv).xyz * 2.0 - 1.0;
    N = perturb(N, vWorld, vUv, m);
  }
  vec3 V = normalize(uCam - vWorld);
  float NoV = clamp(dot(N, V), 1e-4, 1.0);
  vec3 R = reflect(-V, N);

  vec3 F0 = mix(vec3(0.04), base.rgb, metal);
  vec3 diffuseC = base.rgb * (1.0 - metal);

  // key light, high and to the front-left
  vec3 L = normalize(vec3(0.45, 1.0, 0.55));
  vec3 H = normalize(L + V);
  float NoL = clamp(dot(N, L), 0.0, 1.0);
  float NoH = clamp(dot(N, H), 0.0, 1.0);
  float VoH = clamp(dot(V, H), 0.0, 1.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  float a = rough * rough;
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NoL / (NoL * (1.0 - k) + k)) * (NoV / (NoV * (1.0 - k) + k));
  vec3 specKey = D_GGX(NoH, a) * G * F / max(4.0 * NoL * NoV, 1e-4);
  vec3 keyC = vec3(1.0, 0.98, 0.95) * 1.5;

  vec2 ab = envBRDF(NoV, rough);
  vec3 specEnv = studio(R, rough) * (F0 * ab.x + ab.y);
  vec3 diff = diffuseC * (irradiance(N) * 0.78 + keyC * NoL / PI * 2.0);

  vec3 color = (diff + specEnv) * ao + specKey * keyC * NoL;

  if (uClear > 0.0) {
    float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    vec3 Rc = reflect(-V, normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0));
    color = color * (1.0 - Fc * uClear) + studio(Rc, 0.06) * Fc * uClear * ao * 0.75;
  }

  vec3 em = uEmissive;
  if (uHasEm) em *= texture(tEm, vUv).rgb;
  color += em;
  color += edge * vec3(1.0, 0.97, 0.9) * 1.1;

  color = aces(color * uExposure);
  color = pow(color, vec3(1.0 / 2.2));

  float alpha = base.a * uOpacity;
  outColor = vec4(color * alpha, alpha);
}`

export const GROUND_VERT = /* glsl */ `#version 300 es
layout(location=0) in vec2 aXZ;
uniform mat4 uViewProj;
uniform float uRadius;
out vec2 vXZ;
void main() {
  vXZ = aXZ * uRadius;
  gl_Position = uViewProj * vec4(vXZ.x, 0.0, vXZ.y, 1.0);
}`

export const GROUND_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vXZ;
uniform sampler2D tShadow;
uniform vec4 uRect;      // minX, minZ, sizeX, sizeZ of the baked shadow
uniform float uRadius;
uniform float uStrength;
out vec4 outColor;
const vec2 P[12] = vec2[](vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696,0.457), vec2(-0.203,0.621),
  vec2(0.962,-0.195), vec2(0.473,-0.480), vec2(0.519,0.767), vec2(0.185,-0.893), vec2(0.507,0.064),
  vec2(0.896,0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
void main() {
  vec2 uv = (vXZ - uRect.xy) / uRect.zw;
  float soft = 0.0, contact = 0.0;
  for (int i = 0; i < 12; i++) {
    soft += texture(tShadow, uv + P[i] * 0.075).r;
    soft += texture(tShadow, uv + P[i] * 0.035).r;
    contact += texture(tShadow, uv + P[i] * 0.012).g;
  }
  soft /= 24.0;
  contact /= 12.0;
  float fade = smoothstep(uRadius, uRadius * 0.35, length(vXZ));
  float a = (soft * 0.38 + contact * 0.55) * fade * uStrength;
  // a warm, slightly sandy shadow: the Jeep stands on a beach
  outColor = vec4(vec3(0.16, 0.12, 0.07) * a, a);
}`

export const BAKE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vLocal;
in vec3 vNormal;
in vec2 vUv;
out vec4 outColor;
void main() {
  outColor = vec4(1.0, clamp(1.0 - vWorld.y / 0.32, 0.0, 1.0), 0.0, 1.0);
}`
