// 3D renderer: ray-marches the same puppet primitives as signed distance fields
// in WebGL2. Each 3D style is a shading "mode" plus optional post effects.
window.R3D = (() => {
  const { v3, hex } = U;
  const MAXG = 32, NMAT = 64, MAXP = 1024;
  const MODES = {
    pixar: 0, clay: 1, lowpoly: 2, toon: 3, voxel: 4, lego: 5, felt: 6, vinyl: 7, gold: 8, marble: 9, holo: 10,
    crochet: 11, balloon: 12, origami: 13, thermal: 14, plush: 15, porcelain: 16, terracotta: 17, noir: 18,
    tin: 19, wood: 20, chrome: 21, gummy: 22, ice: 23, bronze: 24, chocolate: 25, ps1: 26,
  };
  const POST = { outline: 1, dof: 2, tilt: 4, nv: 8, anaglyph: 16, dither: 32, glow: 64, blur: 128, crease: 256, grain: 512 };
  // spec, roughness, metal, class (1 gloss eye, 2 skin, 3 hair, 4 metal, 5 shell, 6 foliage, 7 building, 8 glass, 9 lit, 10 flag, 11 seal, 12 cloth, 13 turtle skin)
  const MINFO = {
    skin: [0.12, 0.55, 0, 2], skinLight: [0.1, 0.55, 0, 2], hair: [0.35, 0.35, 0, 3], suit: [0.08, 0.7, 0, 12], suitDark: [0.08, 0.7, 0, 12],
    shirt: [0.1, 0.6, 0, 12], tie: [0.3, 0.35, 0, 12], shoe: [0.6, 0.2, 0, 0], eyeDark: [0.6, 0.15, 0, 1], brow: [0.1, 0.6, 0, 3],
    mouth: [0.3, 0.3, 0, 0], white: [0.7, 0.12, 0, 1], black: [0.7, 0.12, 0, 1], shell: [0.4, 0.3, 0, 5], shellDark: [0.4, 0.3, 0, 5],
    shellRim: [0.2, 0.5, 0, 5], tSkin: [0.15, 0.5, 0, 13], belly: [0.15, 0.5, 0, 13], blush: [0, 0.8, 0, 0], hat: [0.3, 0.35, 0, 12],
    lettuce: [0.3, 0.4, 0, 6], lettuceVein: [0.2, 0.5, 0, 6], wood: [0.15, 0.5, 0, 0], woodDark: [0.2, 0.4, 0, 0], podium: [0.25, 0.4, 0, 0],
    seal: [0.8, 0.25, 1, 11], metal: [0.9, 0.2, 1, 4], metalDark: [0.7, 0.3, 1, 4], flag: [0.05, 0.9, 0, 10], wh: [0.05, 0.85, 0, 7],
    whShade: [0.05, 0.85, 0, 7], whWindow: [0.7, 0.08, 0, 8], whLit: [0, 1, 0, 9], trunk: [0.02, 0.9, 0, 0], leaf: [0.05, 0.8, 0, 6],
    leafDark: [0.05, 0.8, 0, 6], reed: [0.05, 0.8, 0, 6], cattail: [0.05, 0.8, 0, 0], lily: [0.2, 0.5, 0, 6], lilyFlower: [0.1, 0.6, 0, 0],
  };

  const VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS_MAIN = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
#define MAXG ${MAXG}
#define NMAT ${NMAT}
#ifdef USE_UBO
layout(std140) uniform Prims { vec4 PR[NP4]; };
#define PF(i, c) PR[(i)*5 + (c)]
#else
uniform sampler2D uPrims;
#define PF(i, c) texelFetch(uPrims, ivec2((c), (i)), 0)
#endif
uniform vec2 uRes;
uniform vec3 uCamPos, uCamF, uCamR, uCamU; uniform float uFocal;
uniform int uNG;
uniform vec3 uGMin[MAXG]; uniform vec3 uGMax[MAXG]; uniform ivec4 uGInfo[MAXG];
uniform vec3 uMat[NMAT]; uniform vec4 uMatInfo[NMAT];
uniform vec3 uSkyTop, uSkyMid, uSkyHor, uSunDir, uSunCol, uLightDir, uLightCol, uAmb, uGround;
uniform float uNight, uTime, uSunSize, uDisp, uBlend, uSeed;
uniform vec4 uPond, uP;
uniform int uMode, uAllObj, uDbg;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oAux;

float h13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y)*p.z); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h13(i), h13(i+vec3(1,0,0)), f.x), mix(h13(i+vec3(0,1,0)), h13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i+vec3(0,0,1)), h13(i+vec3(1,0,1)), f.x), mix(h13(i+vec3(0,1,1)), h13(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a*n3(p); p *= 2.03; a *= 0.5; } return s; }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 qinv(vec4 q, vec3 v){ vec3 u = -q.xyz; return v + 2.0*cross(u, cross(u, v) + q.w*v); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0)/k; return min(a, b) - h*h*k*0.25; }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0 - 1.0)/max(k1, 1e-6); }
float sdRBox(vec3 p, vec3 h, float r){ vec3 q = abs(p) - (h - r); return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdCyl(vec3 p, float r, float hh){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, hh); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = max(dot(ba, ba), 1e-7); float rr = r1 - r2; float a2 = l2 - rr*rr; float il2 = 1.0/l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa*l2 - ba*y; float x2 = dot(xv, xv); float y2 = y*y*l2; float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if (sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if (sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}

int mMat; int mKind; int mPrim;
#define MAXL 12
int gList[MAXL]; int gn_;
void buildList(uint mask){
  gn_ = 0;
  for (int g = 0; g < MAXG; g++){
    if (g >= uNG) break;
    if ((mask & (1u << uint(g))) != 0u && gn_ < MAXL){ gList[gn_] = g; gn_++; }
  }
}
float primDist(int idx, vec3 p, vec4 a){
  vec4 b = PF(idx, 2);
  int ty = int(a.x);
  if (ty == 0) return length(p - b.xyz) - b.w;
  vec4 c = PF(idx, 3);
  if (ty == 2) return sdRoundCone(p, b.xyz, c.xyz, b.w, c.w);
  vec4 q = PF(idx, 4);
  vec3 lp = qinv(q, p - b.xyz);
  if (ty == 1) return sdEll(lp, c.xyz);
  if (ty == 3) return sdRBox(lp, c.xyz, b.w);
  return sdCyl(lp, b.w, c.x);
}
float mapList(vec3 p){
  float best = 1e9; mMat = 0; mKind = 0; mPrim = -1;
  for (int li = 0; li < MAXL; li++){
    if (li >= gn_) break;
    int g = gList[li];
    vec3 c = 0.5*(uGMin[g] + uGMax[g]), e = 0.5*(uGMax[g] - uGMin[g]);
    vec3 q = abs(p - c) - e;
    float db = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    if (db > best) continue;
    ivec4 gi = uGInfo[g];
    float dg = 1e9, dmin = 1e9; int m = 0, pi = -1;
    for (int i = 0; i < 160; i++){
      if (i >= gi.y) break;
      int idx = gi.x + i;
      // bounding sphere (radius already padded by the blend radius): a primitive
      // further away than the current distance cannot change the result
      vec4 bs = PF(idx, 0);
      float lb = length(p - bs.xyz) - bs.w;
      if (lb > min(dg, best) + uBlend + 0.002) continue;
      vec4 a = PF(idx, 1);
      float k = a.z;
      if (gi.z == 1 && a.z > 0.0) k = max(k, uBlend);
      float d = primDist(idx, p, a);
      dg = k > 0.0 ? smin(dg, d, k) : min(dg, d);
      if (d < dmin){ dmin = d; m = int(a.y); pi = idx; }
    }
    if (uDisp > 0.0 && (gi.z >= 1 || uAllObj == 1)) dg += uDisp*(n3(p*uP.x) - 0.5);
    if (gi.z >= 1) dg -= uP.z;
    if (dg < best){ best = dg; mMat = m; mKind = gi.z; mPrim = pi; }
  }
  return best;
}
uint curMask = 0xffffffffu;
float map(vec3 p, uint mask){
  if (mask != curMask){ buildList(mask); curMask = mask; }
  return mapList(p);
}
uint rayMask(vec3 ro, vec3 rd, float tmax, out float tnear){
  uint m = 0u; tnear = 1e9;
  vec3 inv = 1.0/rd;
  for (int g = 0; g < MAXG; g++){
    if (g >= uNG) break;
    vec3 t0 = (uGMin[g] - ro)*inv, t1 = (uGMax[g] - ro)*inv;
    vec3 a3 = min(t0, t1), b3 = max(t0, t1);
    float a = max(max(a3.x, a3.y), a3.z), b = min(min(b3.x, b3.y), b3.z);
    if (b > max(a, 0.0) && a < tmax){ m |= (1u << uint(g)); tnear = min(tnear, max(a, 0.0)); }
  }
  return m;
}
int gSteps = 0;
float castRay(vec3 ro, vec3 rd, uint mask, float t0, float tmax){
  float t = t0;
  for (int i = 0; i < 96; i++){
    gSteps = i;
    float d = map(ro + rd*t, mask);
    if (abs(d) < 0.0006*t + 0.0004) return t;
    t += d*0.95;
    if (t > tmax) return -1.0;
  }
  return -1.0;
}
vec3 calcN(vec3 p, uint mask, float e){
  // tetrahedral differences in a loop (keeps the inlined shader small)
  vec3 n = vec3(0.0);
  for (int i = 0; i < 4; i++){
    vec3 k = 0.5773*(2.0*vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += k*map(p + k*e, mask);
  }
  return normalize(n);
}
float proxy(vec3 p, uint mask){
  float best = 1e9;
  for (int g = 0; g < MAXG; g++){
    if (g >= uNG) break;
    if ((mask & (1u << uint(g))) == 0u) continue;
    vec3 c = 0.5*(uGMin[g] + uGMax[g]), e = max(0.5*(uGMax[g] - uGMin[g]), vec3(0.01));
    best = min(best, sdEll(p - c, e*0.86));
  }
  return best;
}
float softShadow(vec3 ro, vec3 rd, float k, float hard){
  if (uDbg == 3) return 1.0;
  float tn; uint m = rayMask(ro, rd, 40.0, tn);
  if (m == 0u) return 1.0;
  float res = 1.0, t = max(0.015, tn);
  for (int i = 0; i < 24; i++){
    float h = proxy(ro + rd*t, m);
    res = min(res, hard > 0.5 ? (h < 0.002 ? 0.0 : 1.0) : k*h/t);
    if (res < 0.01) return 0.0;
    t += clamp(h, 0.03, 0.6);
    if (t > 40.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float calcAO(vec3 p, vec3 n, uint mask){
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 3; i++){
    float h = 0.03*float(i)*float(i);
    o += (h - map(p + n*h, mask))*s; s *= 0.6;
  }
  return clamp(1.0 - 2.2*o, 0.0, 1.0);
}

vec3 skyCol(vec3 rd){
  float y = rd.y;
  vec3 c = mix(uSkyHor, uSkyMid, smoothstep(-0.02, 0.22, y));
  c = mix(c, uSkyTop, smoothstep(0.18, 0.6, y));
  float s = max(dot(rd, uSunDir), 0.0);
  c += uSunCol*(smoothstep(1.0 - 0.0009*uSunSize*uSunSize, 1.0 - 0.0006*uSunSize*uSunSize, s)*1.5 + pow(s, 10.0)*0.25);
  if (y > 0.01){
    vec2 uv = rd.xz/(y + 0.12);
    float n = fbm(vec3(uv*0.9 + vec2(uTime*0.02, 0.0), 1.7));
    vec3 cc = mix(vec3(1.0), uSkyHor, 0.25);
    if (uNight > 0.5) cc = vec3(0.28, 0.26, 0.45);
    c = mix(c, cc, smoothstep(0.6, 0.78, n)*smoothstep(0.02, 0.15, y)*0.9);
  }
  if (uNight > 0.5 && y > 0.04){
    vec3 g = floor(rd*180.0);
    float st = h13(g);
    if (st > 0.993) c += vec3(1.0)*(0.6 + 0.4*sin(uTime*3.0 + st*90.0));
  }
  return c;
}

// procedural material helpers
vec3 flagCol(vec3 lp, vec3 h){
  vec2 uv = vec2(lp.x/h.x*0.5 + 0.5, lp.y/h.y*0.5 + 0.5);
  if (uv.x < 0.42 && uv.y > 6.0/13.0){
    vec2 g = fract(uv*vec2(14.0, 18.0)) - 0.5;
    return length(g) < 0.22 ? vec3(0.95) : vec3(0.24, 0.23, 0.43);
  }
  return mod(floor(uv.y*13.0), 2.0) < 0.5 ? vec3(0.7, 0.13, 0.2) : vec3(0.95);
}
vec3 sealCol(vec3 lp, float r){
  vec2 uv = lp.xz/r;
  float d = length(uv);
  vec3 gold = vec3(0.89, 0.73, 0.29), navy = vec3(0.12, 0.2, 0.43);
  if (d > 0.82) return gold;
  vec2 q = uv - vec2(0.0, -0.05);
  bool dome = q.y > 0.0 && length(q*vec2(1.0, 1.4)) < 0.42;
  bool head = length(uv - vec2(0.5, 0.02)) < 0.13;
  bool legs = (length(uv - vec2(-0.3, -0.12)) < 0.09) || (length(uv - vec2(0.25, -0.12)) < 0.09);
  return (dome || head || legs) ? gold : navy;
}

vec3 thermal(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 c = mix(vec3(0.0, 0.0, 0.1), vec3(0.3, 0.0, 0.6), smoothstep(0.0, 0.25, x));
  c = mix(c, vec3(0.9, 0.1, 0.2), smoothstep(0.25, 0.5, x));
  c = mix(c, vec3(1.0, 0.6, 0.0), smoothstep(0.5, 0.75, x));
  return mix(c, vec3(1.0, 1.0, 0.85), smoothstep(0.75, 1.0, x));
}
float heat(int cls, int mat){
  if (cls == 2) return 0.95;
  if (cls == 1) return 0.8;
  if (cls == 3) return 0.7;
  if (cls == 12) return 0.55;
  if (cls == 13) return 0.42;
  if (cls == 5) return 0.33;
  if (cls == 7) return 0.18;
  if (cls == 9) return 0.75;
  if (cls == 4) return 0.12;
  return 0.25;
}

vec3 envCol(vec3 r){ return r.y > 0.0 ? skyCol(r) : mix(uSkyHor, uGround*0.6, smoothstep(0.0, -0.3, r.y)); }

vec3 shadeObj(vec3 p, vec3 n, vec3 rd, int mat, int kind, int prim, float t, uint mask){
  vec3 base = uMat[mat];
  vec4 mi = uMatInfo[mat];
  int cls = int(mi.w);
  // procedural decals
  if (prim >= 0 && (cls == 10 || cls == 11)){
    vec4 b = PF(prim, 2);
    vec4 c = PF(prim, 3);
    vec4 q = PF(prim, 4);
    vec3 lp = qinv(q, p - b.xyz);
    base = cls == 10 ? flagCol(lp, c.xyz) : sealCol(lp, b.w);
  }
  bool obj = kind >= 1 || uAllObj == 1;
  vec3 L = uLightDir;
  vec3 V = -rd;
  int mode = uMode;
  if (!obj) mode = 0;

  // geometry-ish modifiers of the normal
  if (mode == 1 || mode == 17){ // clay: fingerprints and lumps
    float fp = sin(dot(p, vec3(210.0, 120.0, 160.0)) + 6.0*n3(p*10.0));
    n = normalize(n + (vec3(n3(p*30.0), n3(p*30.0 + 7.1), n3(p*30.0 + 3.3)) - 0.5)*0.3 + fp*0.035*uP.y);
  }
  if (mode == 6 || mode == 15){ // felt / plush fuzz
    float f = mode == 15 ? 90.0 : 120.0;
    n = normalize(n + (vec3(n3(p*f), n3(p*f + 4.0), n3(p*f + 9.0)) - 0.5)*(mode == 15 ? 0.9 : 0.7));
    base *= 0.88 + 0.24*n3(p*f*0.5);
  }
  if (mode == 11){ // crochet stitches (triplanar-ish)
    vec3 a = abs(n);
    vec2 uv = a.x > a.y && a.x > a.z ? p.zy : (a.y > a.z ? p.xz : p.xy);
    vec2 g = uv*vec2(15.0, 21.0);
    float row = floor(g.y);
    float v = abs(fract(g.x + 0.5*mod(row, 2.0)) - 0.5)*2.0;
    float stitch = smoothstep(0.0, 1.0, 1.0 - abs(fract(g.y) - 0.5)*2.0)*(0.6 + 0.4*v);
    n = normalize(n + (vec3(n3(p*120.0), n3(p*120.0 + 3.0), n3(p*120.0 + 6.0)) - 0.5)*0.5);
    base *= 0.72 + 0.4*stitch;
  }
  if (mode == 2 || mode == 13 || mode == 26){ // faceted
    float q = mode == 13 ? 1.1 : (mode == 26 ? 2.5 : 1.25);
    vec3 nq = normalize(floor(n*q + 0.5) + vec3(0.0001));
    n = normalize(mix(n, nq, mode == 26 ? 0.6 : (mode == 13 ? 0.97 : 0.92)));
  }

  float sh = softShadow(p + n*0.003, L, 10.0, mode == 18 ? 1.0 : 0.0);
  float ao = calcAO(p, n, mask);
  float dif = max(dot(n, L), 0.0);
  if (cls == 2) dif = max((dot(n, L) + 0.35)/1.35, 0.0);
  vec3 H = normalize(L + V);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 5.0);
  float spe = pow(max(dot(n, H), 0.0), mix(90.0, 8.0, mi.y))*mi.x;
  vec3 amb = uAmb*(0.6 + 0.4*n.y);
  vec3 col = lin(base);
  vec3 o;

  if (mode == 0 || mode == 7 || mode == 26){ // pixar / vinyl / ps1
    float specK = mode == 7 ? 2.2 : 1.0;
    if (mode == 7) col = lin(clamp((base - 0.5)*1.15 + 0.5 + 0.03, 0.0, 1.0));
    o = col*(uLightCol*dif*sh*1.25 + amb*ao*0.85);
    o += uLightCol*spe*sh*specK*(mode == 7 ? 1.0 : 0.6);
    o += fres*envCol(reflect(rd, n))*(mode == 7 ? 0.35 : 0.12)*ao;
    if (cls == 2) o += col*vec3(1.0, 0.35, 0.2)*0.12*(1.0 - dif);
    if (cls == 9) o = col*1.8;
  } else if (mode == 1 || mode == 12 || mode == 17){ // clay family
    if (mode == 17) col = lin(vec3(0.74, 0.4, 0.26))*(0.8 + 0.25*lum(base));
    o = col*(uLightCol*dif*sh*1.15 + amb*ao*0.75);
    o += uLightCol*spe*sh*0.25;
    o *= 0.85 + 0.3*ao;
  } else if (mode == 12){ // balloon: glossy latex
    col = lin(clamp(base*1.1 + 0.05, 0.0, 1.0));
    float wrap = max((dot(n, L) + 0.4)/1.4, 0.0);
    o = col*(uLightCol*wrap*(0.5 + 0.5*sh)*1.1 + amb*0.55);
    o += vec3(1.0)*pow(max(dot(n, H), 0.0), 140.0)*1.6 + vec3(1.0)*pow(max(dot(n, H), 0.0), 20.0)*0.18;
    o += col*pow(1.0 - max(dot(n, V), 0.0), 2.5)*0.9;
  } else if (mode == 3){ // toon
    float band = dif*sh > 0.55 ? 1.0 : (dif*sh > 0.12 ? 0.68 : 0.42);
    o = col*(uLightCol*band*1.05 + amb*0.35);
    if (spe*sh > 0.35) o += vec3(0.6);
    if (pow(1.0 - max(dot(n, V), 0.0), 3.0) > 0.55) o += col*0.25;
  } else if (mode == 6 || mode == 15){ // felt / plush
    float sheen = pow(1.0 - max(dot(n, V), 0.0), 2.0);
    col = lin(mix(base, vec3(lum(base)), mode == 15 ? 0.0 : 0.15));
    if (mode == 15) col = lin(mix(base, vec3(1.0), 0.18));
    o = col*(uLightCol*dif*sh + amb*ao*0.9) + col*sheen*0.6*ao;
  } else if (mode == 8 || mode == 24 || mode == 21){ // gold / bronze / chrome
    vec3 F0 = mode == 8 ? vec3(1.0, 0.76, 0.33) : (mode == 24 ? vec3(0.55, 0.32, 0.17) : vec3(0.95));
    vec3 r = reflect(rd, n);
    vec3 env = envCol(r);
    vec3 fr = F0 + (1.0 - F0)*fres;
    o = env*fr*ao*(mode == 21 ? 1.0 : 0.85) + F0*uLightCol*pow(max(dot(n, H), 0.0), 60.0)*sh*1.5;
    o += F0*uLightCol*dif*sh*0.25;
    if (mode == 24){ // green patina in crevices
      float pat = (1.0 - ao)*0.9 + 0.45*fbm(p*9.0);
      o = mix(o*0.8, lin(vec3(0.3, 0.58, 0.48))*(0.25 + 0.6*dif*sh), smoothstep(0.38, 0.7, pat));
    }
  } else if (mode == 9){ // marble
    float v = abs(sin(p.x*9.0 + p.y*4.0 + 7.0*fbm(p*3.0)));
    vec3 m = mix(vec3(0.92, 0.91, 0.88), vec3(0.55, 0.56, 0.6), pow(1.0 - v, 9.0)*0.8);
    col = lin(m);
    o = col*(uLightCol*dif*sh*1.1 + amb*ao*0.6) + vec3(0.6)*pow(max(dot(n, H), 0.0), 40.0)*sh*0.4;
    o += col*0.12*pow(1.0 - max(dot(n, V), 0.0), 2.0);
  } else if (mode == 10){ // hologram
    float rim = pow(1.0 - max(dot(n, V), 0.0), 1.6);
    float scan = 0.65 + 0.35*sin(p.y*260.0 - uTime*30.0);
    o = vec3(0.2, 0.75, 1.0)*(0.15 + rim*1.6)*scan + vec3(0.1, 0.4, 0.6)*lum(base)*0.5;
  } else if (mode == 11){ // crochet
    o = col*(uLightCol*dif*sh + amb*ao*0.9) + col*0.25*pow(1.0 - max(dot(n, V), 0.0), 2.0);
  } else if (mode == 13){ // origami paper
    float fiber = 0.92 + 0.08*n3(p*300.0);
    col = lin(mix(base, vec3(1.0), 0.25))*fiber;
    o = col*(uLightCol*dif*sh + amb*0.85);
  } else if (mode == 14){ // thermal
    float hv = heat(cls, mat)*(0.75 + 0.25*max(dot(n, V), 0.0)) + 0.05*n3(p*30.0);
    o = lin(thermal(hv));
  } else if (mode == 16){ // blue & white porcelain
    float l = lum(base);
    vec3 cobalt = vec3(0.07, 0.2, 0.62);
    float pattern = smoothstep(0.45, 0.5, fbm(p*14.0))*(1.0 - smoothstep(0.5, 0.56, fbm(p*14.0)));
    vec3 pc = mix(cobalt, vec3(0.96, 0.97, 1.0), smoothstep(0.25, 0.65, l));
    pc = mix(pc, cobalt, pattern*0.7);
    col = lin(pc);
    o = col*(uLightCol*dif*sh + amb*ao*0.85) + uLightCol*pow(max(dot(n, H), 0.0), 120.0)*sh*1.5 + envCol(reflect(rd, n))*fres*0.5;
  } else if (mode == 18){ // film noir
    float blinds = step(0.3, fract((p.y + p.x*0.4)*7.0));
    float l = 0.45 + 0.55*lum(base);
    o = vec3(l)*(vec3(3.2)*dif*sh*blinds + 0.22*ao);
  } else if (mode == 19){ // tin toy
    vec3 r = reflect(rd, n);
    float wear = smoothstep(0.62, 0.7, fbm(p*25.0));
    vec3 tin = mix(col, lin(vec3(0.75)), wear);
    o = tin*(uLightCol*dif*sh*0.9 + amb*ao*0.6) + envCol(r)*0.25*(0.4 + 0.6*fres) + uLightCol*pow(max(dot(n, H), 0.0), 80.0)*sh*1.2;
  } else if (mode == 20){ // carved wood
    float rings = fract(length(p.xz - vec2(floor(p.x*2.0)*0.5, 0.0))*18.0 + 4.0*fbm(p*6.0));
    vec3 w1 = mix(vec3(0.45, 0.27, 0.13), vec3(0.75, 0.53, 0.3), lum(base));
    vec3 wc = mix(w1, w1*0.7, smoothstep(0.3, 0.9, rings));
    col = lin(wc);
    o = col*(uLightCol*dif*sh + amb*ao*0.7) + uLightCol*pow(max(dot(n, H), 0.0), 30.0)*sh*0.25;
  } else if (mode == 22){ // gummy candy
    vec3 g = lin(clamp(base*1.2, 0.0, 1.0));
    float thick = clamp(-map(p - n*0.05, mask)*14.0, 0.0, 1.0);
    float back = pow(clamp(dot(rd, -L)*0.5 + 0.5, 0.0, 1.0), 2.0);
    o = g*(0.45 + 0.4*dif*sh) + g*(1.0 - thick)*0.9 + g*back*0.4;
    o += vec3(1.0)*pow(max(dot(n, H), 0.0), 160.0)*1.8 + envCol(reflect(rd, n))*fres*0.5;
    o *= 0.9 + 0.1*h13(floor(p*400.0));
  } else if (mode == 23){ // ice
    vec3 ic = lin(vec3(0.72, 0.88, 0.98));
    float cracks = smoothstep(0.48, 0.5, fbm(p*10.0))*(1.0 - smoothstep(0.5, 0.52, fbm(p*10.0)));
    o = ic*(0.45 + 0.55*dif) + envCol(reflect(rd, n))*(0.25 + 0.75*fres) + vec3(1.0)*pow(max(dot(n, H), 0.0), 160.0)*2.0;
    o = mix(o, vec3(1.0), cracks*0.6);
  } else if (mode == 25){ // chocolate
    float l = lum(base);
    vec3 choc = l > 0.75 ? vec3(0.93, 0.86, 0.72) : mix(vec3(0.23, 0.12, 0.06), vec3(0.55, 0.32, 0.17), smoothstep(0.1, 0.6, l));
    col = lin(choc);
    o = col*(uLightCol*dif*sh + amb*ao*0.7) + uLightCol*pow(max(dot(n, H), 0.0), 70.0)*sh*0.9 + envCol(reflect(rd, n))*fres*0.25;
  } else if (mode == 4 || mode == 5){ // voxel / lego handled in main(); fallback
    o = col*(uLightCol*dif*sh + amb*ao);
  } else {
    o = col*(uLightCol*dif*sh + amb*ao);
  }
  if (cls == 9 && mode != 14) o = lin(base)*1.6;
  return o;
}

vec3 groundShade(vec3 ro, vec3 rd, float t){
  vec3 p = ro + rd*t;
  vec3 g = lin(uGround);
  if (mod(floor(p.x/0.8), 2.0) > 0.5) g *= 0.82;
  vec2 d = (p.xz - uPond.xy)/uPond.zw;
  float a = atan(d.y, d.x);
  float pr = length(d)/(1.0 + 0.05*sin(a*3.0));
  vec3 n = vec3(0.0, 1.0, 0.0);
  float sh = softShadow(p + n*0.002, uLightDir, 8.0, uMode == 18 ? 1.0 : 0.0);
  vec3 o;
  if (pr < 1.0){
    vec3 wn = normalize(vec3(sin(p.x*9.0 + uTime*2.0)*0.03, 1.0, cos(p.z*11.0 + uTime*1.7)*0.03));
    vec3 r = reflect(rd, wn);
    float fr = 0.25 + 0.75*pow(1.0 - max(r.y, 0.0), 4.0);
    vec3 water = lin(uNight > 0.5 ? vec3(0.12, 0.18, 0.35) : vec3(0.25, 0.48, 0.66));
    o = mix(water, lin(skyCol(r)), fr*0.7)*(0.55 + 0.45*sh);
  } else {
    if (pr < 1.07) g = lin(vec3(0.42, 0.34, 0.22));
    g *= 0.92 + 0.16*n3(p*6.0);
    o = g*(lin(uLightCol)*max(uLightDir.y, 0.0)*sh*1.05 + lin(uAmb)*0.6);
  }
  if (uAllObj == 1 && pr >= 1.0){
    if (uMode == 1){ // clay: lumpy plasticine lawn with finger smudges
      float fp = sin(dot(p.xz, vec2(140.0, 90.0)) + 5.0*n3(p*6.0));
      o = lin(uGround)*(0.82 + 0.3*n3(p*5.0) + 0.05*fp)*(lin(uLightCol)*max(uLightDir.y, 0.0)*sh*1.05 + lin(uAmb)*0.6);
    } else if (uMode == 6){ // felt: fuzzy fabric lawn
      o = lin(uGround)*(0.85 + 0.25*n3(p*90.0) + 0.1*n3(p*7.0))*(lin(uLightCol)*max(uLightDir.y, 0.0)*sh + lin(uAmb)*0.65);
    } else if (uMode == 2){ // low-poly: flat triangles
      vec2 g = p.xz*0.9; vec2 cell = floor(g); vec2 f = fract(g);
      float tri = f.x > f.y ? 1.0 : 0.0;
      o = lin(uGround)*(0.85 + 0.2*h13(vec3(cell, tri)))*(lin(uLightCol)*max(uLightDir.y, 0.0)*sh*1.05 + lin(uAmb)*0.6);
    }
  }
  if (uMode == 18) o = vec3(lum(o))*(0.25 + 0.75*sh)*0.6;
  if (uMode == 14) o = lin(thermal(0.12 + 0.06*n3(p*4.0) + (pr < 1.0 ? -0.08 : 0.0)));
  return o;
}

// DDA through a voxel grid for the voxel / LEGO modes.
bool voxelHit(vec3 ro, vec3 rd, uint mask, float t0, vec3 cs, out vec3 hitN, out float tHit, out vec3 cell){
  vec3 p = ro + rd*t0;
  vec3 c = floor(p/cs);
  vec3 stp = sign(rd);
  vec3 tD = abs(cs/rd);
  vec3 tM = ((c + max(stp, 0.0))*cs - ro)/rd;
  hitN = vec3(0.0);
  for (int i = 0; i < 64; i++){
    vec3 cc = (c + 0.5)*cs;
    if (map(cc, mask) < 0.0){ tHit = dot(tM - tD, abs(hitN)); cell = c; if (dot(hitN, hitN) < 0.5) hitN = -rd; return true; }
    if (tM.x < tM.y && tM.x < tM.z){ c.x += stp.x; tM.x += tD.x; hitN = vec3(-stp.x, 0.0, 0.0); }
    else if (tM.y < tM.z){ c.y += stp.y; tM.y += tD.y; hitN = vec3(0.0, -stp.y, 0.0); }
    else { c.z += stp.z; tM.z += tD.z; hitN = vec3(0.0, 0.0, -stp.z); }
  }
  return false;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 s = (fc - 0.5*uRes)/uRes.y;
  vec3 rd = normalize(uCamF*uFocal + uCamR*s.x + uCamU*s.y);
  vec3 ro = uCamPos;
  float tg = rd.y < -1e-4 ? -ro.y/rd.y : 1e9;
  float tmax = min(tg, 120.0);
  float tn; uint mask = rayMask(ro, rd, tmax, tn);
  float t = -1.0;
  vec3 col; int mat = 0, kind = -1, prim = -1;
  float depth = 1.0;
  if (uDbg == 2) mask = 0u;
  if (mask != 0u) t = castRay(ro, rd, mask, tn, tmax);
  if (t > 0.0){
    vec3 p = ro + rd*t;
    map(p, mask); mat = mMat; kind = mKind; prim = mPrim;
    vec3 n = calcN(p, mask, 0.0012);
    if ((uMode == 4 || uMode == 5) && kind >= 1){
      vec3 cs = uMode == 5 ? vec3(0.07, 0.084, 0.07) : vec3(0.055);
      vec3 vn; float vt; vec3 cell;
      float tStart = max(t - 0.12, 0.0);
      if (voxelHit(ro, rd, mask, tStart, cs, vn, vt, cell)){
        vec3 cc = (cell + 0.5)*cs;
        map(cc, mask); mat = mMat; kind = mKind;
        vec3 hp = ro + rd*max(vt, tStart);
        vec3 base = lin(uMat[mat]);
        if (uMode == 5) base = lin(clamp((uMat[mat] - 0.5)*1.2 + 0.52, 0.0, 1.0));
        float sh = softShadow(hp + vn*0.004, uLightDir, 12.0, 0.0);
        float dif = max(dot(vn, uLightDir), 0.0);
        vec3 lp = (hp - cell*cs)/cs; // 0..1 inside the cell
        float edge = 1.0;
        if (uMode == 5){
          vec3 e3 = min(lp, 1.0 - lp);
          float e = vn.x != 0.0 ? min(e3.y, e3.z) : (vn.y != 0.0 ? min(e3.x, e3.z) : min(e3.x, e3.y));
          edge = 0.82 + 0.18*smoothstep(0.0, 0.1, e);
          if (vn.y > 0.5 && map(cc + vec3(0.0, cs.y, 0.0), mask) > 0.0){
            float r = length(lp.xz - 0.5);
            edge *= r < 0.3 ? (r > 0.24 ? 0.75 : 1.12) : 1.0;
          }
          base *= 0.92 + 0.12*h13(cell);
        } else {
          base *= 0.85 + 0.2*h13(cell);
        }
        col = base*(lin(uLightCol)*dif*sh*1.2 + lin(uAmb)*(0.55 + 0.25*vn.y))*edge;
        vec3 H = normalize(uLightDir - rd);
        if (uMode == 5) col += lin(uLightCol)*pow(max(dot(vn, H), 0.0), 60.0)*sh*0.6;
        t = max(vt, tStart);
      } else {
        col = vec3(-1.0);
      }
      if (col.x < 0.0){ kind = -1; t = -1.0; }
    } else if (uDbg == 1) {
      col = lin(uMat[mat])*(0.4 + 0.6*max(dot(n, uLightDir), 0.0));
    } else {
      col = shadeObj(p, n, rd, mat, kind, prim, t, mask);
    }
    if (t > 0.0) depth = clamp(t/60.0, 0.0, 1.0);
  }
  if (t <= 0.0){
    if (tg < 1e8){ col = groundShade(ro, rd, tg); depth = clamp(tg/60.0, 0.0, 1.0); kind = -2; }
    else { col = lin(skyCol(rd)); depth = 1.0; kind = -3; }
    if (uMode == 14 && kind == -3) col = lin(thermal(0.02));
    if (uMode == 9 && kind == -3) col = lin(mix(vec3(0.16, 0.15, 0.17), vec3(0.04), smoothstep(0.0, 0.5, rd.y)));
    if (uMode == 9 && kind == -2) col *= 0.35;
    if (uMode == 18 && kind == -3) col = lin(vec3(0.55 - 0.35*smoothstep(0.0, 0.5, rd.y)));
  }
  if (uDbg == 4){
    int bc = 0; for (int g = 0; g < MAXG; g++) if ((mask & (1u << uint(g))) != 0u) bc++;
    oCol = vec4(float(gSteps)/96.0, clamp(float(gSteps)/24.0 - 3.0, 0.0, 1.0), float(bc)/6.0, 1.0);
    oAux = vec4(0.0);
    return;
  }
  // aerial perspective
  float fog = 1.0 - exp(-max(depth*60.0 - 8.0, 0.0)*0.02);
  if (uMode != 14 && uMode != 10 && !(uMode == 9 && kind < 0)) col = mix(col, lin(uSkyHor), fog*0.55);
  if (uMode == 10 && kind < 1) col = mix(col, vec3(lum(col))*vec3(0.25, 0.4, 0.55), 0.75)*0.55;
  // tone map + gamma
  col = col/(1.0 + col*0.15);
  col = pow(max(col, 0.0), vec3(1.0/2.2));
  oCol = vec4(col, 1.0);
  float dq = floor(depth*65535.0);
  oAux = vec4(floor(dq/256.0)/255.0, mod(dq, 256.0)/255.0, float(mat)/63.0, float(kind + 3)/7.0);
}`;

  const FS_POST = `#version 300 es
precision highp float;
uniform sampler2D uCol; uniform sampler2D uAux;
uniform vec2 uRes; uniform int uFlags; uniform float uTime, uSeed; uniform vec4 uPP; uniform vec3 uLineCol;
out vec4 o;
float depthAt(vec2 uv){ vec4 a = texture(uAux, uv); return (a.x*255.0*256.0 + a.y*255.0)/65535.0; }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec3 blurAt(vec2 uv, float r){
  vec3 acc = vec3(0.0); float w = 0.0;
  for (int i = 0; i < 16; i++){
    float a = float(i)*2.39996; float rr = sqrt(float(i) + 0.5)/4.0;
    vec2 off = vec2(cos(a), sin(a))*rr*r/uRes;
    acc += texture(uCol, uv + off).rgb; w += 1.0;
  }
  return acc/w;
}
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec3 c = texture(uCol, uv).rgb;
  float d = depthAt(uv);
  if ((uFlags & 2) != 0){ // depth of field (focus uPP.x in depth units)
    float coc = clamp(abs(d - uPP.x)*uPP.y, 0.0, 1.0)*uPP.z;
    if (coc > 0.5) c = blurAt(uv, coc);
  }
  if ((uFlags & 4) != 0){ // tilt shift
    float k = smoothstep(0.12, 0.42, abs(uv.y - uPP.w));
    if (k > 0.01) c = blurAt(uv, k*9.0*uRes.y/720.0);
    c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.35);
    c = (c - 0.5)*1.12 + 0.5;
  }
  if ((uFlags & 16) != 0){ // anaglyph: horizontal parallax from depth
    float sh = (0.012 - (1.0 - d)*0.02)*0.6;
    float l = dot(texture(uCol, uv + vec2(sh, 0.0)).rgb, vec3(0.3, 0.59, 0.11));
    vec3 r = texture(uCol, uv - vec2(sh, 0.0)).rgb;
    c = vec3(l, r.g, r.b);
  }
  if ((uFlags & 1) != 0 || (uFlags & 256) != 0){ // outlines from depth / material / object id
    vec2 px = 1.0/uRes*(uRes.y/720.0)*1.6;
    vec4 a0 = texture(uAux, uv);
    float e = 0.0;
    for (int i = 0; i < 4; i++){
      vec2 off = i == 0 ? vec2(px.x, 0.0) : (i == 1 ? vec2(-px.x, 0.0) : (i == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y)));
      vec4 a1 = texture(uAux, uv + off);
      float dd = abs(depthAt(uv + off) - d)/max(d, 0.02);
      e = max(e, step(0.035, dd));
      if ((uFlags & 1) != 0) e = max(e, step(0.004, abs(a1.z - a0.z))*step(0.4, a0.w));
    }
    if (a0.w < 0.4 && (uFlags & 1) != 0) e *= 0.0;
    c = mix(c, uLineCol, e*((uFlags & 256) != 0 ? 0.35 : 1.0));
  }
  if ((uFlags & 64) != 0){ c += blurAt(uv, 10.0)*0.6; }
  if ((uFlags & 128) != 0){ c = blurAt(uv, 3.0); }
  if ((uFlags & 8) != 0){ // night vision
    float l = dot(c, vec3(0.3, 0.59, 0.11));
    l = l*1.6 + (h12(gl_FragCoord.xy + uSeed*91.0) - 0.5)*0.25;
    c = vec3(0.15, 1.0, 0.3)*l;
    c *= 0.85 + 0.15*sin(gl_FragCoord.y*1.6);
    c *= 1.0 - smoothstep(0.35, 0.75, length((uv - 0.5)*vec2(uRes.x/uRes.y, 1.0)));
  }
  if ((uFlags & 32) != 0){ // PS1 style 15-bit color with ordered dither
    int x = int(mod(gl_FragCoord.x, 4.0)), y = int(mod(gl_FragCoord.y, 4.0));
    int idx = x + y*4;
    float b = float((idx * 7 + (idx / 4) * 5) % 16)/16.0 - 0.5;
    c = floor(c*31.0 + b + 0.5)/31.0;
  }
  if ((uFlags & 512) != 0){ c += (h12(gl_FragCoord.xy + uSeed*13.0) - 0.5)*0.08; }
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  let gl = null, canvas = null, progMain, progPost, primTex, ubo = null, maxPrims = MAXP, fbo, tCol, tAux, curW = 0, curH = 0;
  const useUBO = /[?&]ubo3d/.test(location.search);
  let uMain = {}, uPost = {};
  let failed = false;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return [p, u];
  }
  function init() {
    if (gl || failed) return !!gl;
    try {
      canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('no webgl2');
      let fs = FS_MAIN;
      if (useUBO) {
        maxPrims = Math.min(MAXP, Math.floor(gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE) / 80));
        fs = fs.replace('precision highp sampler2D;', `precision highp sampler2D;\n#define USE_UBO\n#define NP4 ${maxPrims * 5}`);
      }
      [progMain, uMain] = program(fs);
      if (useUBO) {
        ubo = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
        gl.bufferData(gl.UNIFORM_BUFFER, maxPrims * 80, gl.DYNAMIC_DRAW);
        gl.uniformBlockBinding(progMain, gl.getUniformBlockIndex(progMain, 'Prims'), 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);
      }
      [progPost, uPost] = program(FS_POST);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      primTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, primTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      fbo = gl.createFramebuffer();
      tCol = gl.createTexture(); tAux = gl.createTexture();
    } catch (e) {
      console.error('3D renderer unavailable:', e.message);
      failed = true; gl = null;
    }
    return !!gl;
  }
  function sizeTargets(w, h) {
    if (w === curW && h === curH) return;
    curW = w; curH = h;
    canvas.width = w; canvas.height = h;
    for (const t of [tCol, tAux]) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tCol, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, tAux, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const TYPES = { sph: 0, ell: 1, cap: 2, box: 3, cyl: 4 };
  const primRadius = (p) => (p.t === 'sph' ? p.r : p.t === 'cap' ? U.v3.len(U.v3.sub(p.a, p.b)) / 2 + p.ra : p.t === 'ell' ? Math.max(...p.rad) : p.t === 'box' ? Math.hypot(...p.h) : Math.hypot(p.r, p.hh));
  // Flatten the scene into sub-groups (one per puppet part) and a primitive texture.
  function pack(S, opts) {
    const data = new Float32Array(MAXP * 20);
    const groups = [];
    let n = 0;
    const kindOf = (name) => (name === 'whitehouse' || name === 'tree' || name === 'pond' ? 0 : name === 'trump' || name === 'turtle' ? 1 : 2);
    S.groups.forEach((g, gi) => {
      const parts = new Map();
      for (const p of g.prims) {
        if (p.only2d) continue;
        const key = p.part || 'main';
        if (!parts.has(key)) parts.set(key, []);
        parts.get(key).push(p);
      }
      for (const [, list0] of parts) {
        const list = list0.slice().sort((a, b) => primRadius(b) - primRadius(a));
        const start = n;
        const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        const grow = (c, r) => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], c[i] - r); mx[i] = Math.max(mx[i], c[i] + r); } };
        for (const p of list) {
          if (n >= maxPrims) break;
          const o = n * 20;
          data[o + 4] = TYPES[p.t]; data[o + 5] = RIG.MAT_INDEX[p.mat] ?? 0; data[o + 6] = p.k || 0; data[o + 7] = gi;
          const pad = (p.k || 0) + (opts.pad || 0);
          let bc, br;
          if (p.t === 'sph') { data.set([...p.c, p.r], o + 8); bc = p.c; br = p.r; }
          else if (p.t === 'cap') {
            const b = v3.len(v3.sub(p.a, p.b)) < 1e-4 ? v3.add(p.a, [0, 1e-4, 0]) : p.b;
            data.set([...p.a, p.ra], o + 8); data.set([...b, p.rb], o + 12);
            bc = v3.lerp(p.a, b, 0.5); br = v3.len(v3.sub(p.a, b)) / 2 + Math.max(p.ra, p.rb);
          } else {
            const q = U.m3.toQuat(p.R);
            data.set(q, o + 16);
            bc = p.c;
            if (p.t === 'ell') { data.set([...p.c, 0], o + 8); data.set([...p.rad, 0], o + 12); br = Math.max(...p.rad); }
            if (p.t === 'box') { data.set([...p.c, p.rr], o + 8); data.set([...p.h, 0], o + 12); br = Math.hypot(...p.h); }
            if (p.t === 'cyl') { data.set([...p.c, p.r], o + 8); data.set([p.hh, 0, 0, 0], o + 12); br = Math.hypot(p.r, p.hh); }
          }
          // bounding sphere (padded for displacement); its radius doubles as the cull test
          data.set([...bc, br + (opts.pad || 0) * 0.5 + (p.k || 0)], o);
          grow(bc, br + pad);
          n++;
        }
        if (n > start) groups.push({ start, count: n - start, kind: kindOf(g.name), mn, mx });
      }
    });
    // too many sub-groups: merge the smallest background ones by widening (rare)
    while (groups.length > MAXG) {
      const a = groups.pop(), b = groups[groups.length - 1];
      if (b.start + b.count === a.start) {
        b.count += a.count;
        for (let i = 0; i < 3; i++) { b.mn[i] = Math.min(b.mn[i], a.mn[i]); b.mx[i] = Math.max(b.mx[i], a.mx[i]); }
      }
    }
    return { data, n, groups };
  }

  function setU(u, name, ...v) {
    const loc = u[name];
    if (loc === undefined || loc === null) return;
    if (v.length === 1 && typeof v[0] === 'number') gl.uniform1f(loc, v[0]);
    else if (v.length === 2) gl.uniform2f(loc, ...v);
    else if (v.length === 3) gl.uniform3f(loc, ...v);
    else if (v.length === 4) gl.uniform4f(loc, ...v);
  }
  const c01 = (c) => [c[0] / 255, c[1] / 255, c[2] / 255];

  // Render frame F with 3D options. Returns the GL canvas (size w x h).
  function render(F, o) {
    if (!init()) return null;
    const scale = o.res || 0.5;
    const w = Math.max(64, Math.round(F.W * scale)), h = Math.max(36, Math.round(F.H * scale));
    sizeTargets(w, h);
    const S = F.S, C = F.C;
    const P = pack(S, { pad: (o.disp || 0) * 0.6 + (o.blend || 0) + 0.01 });
    if (useUBO) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, P.data.subarray(0, Math.max(1, P.n) * 20));
    } else {
      gl.bindTexture(gl.TEXTURE_2D, primTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 5, Math.max(1, P.n), 0, gl.RGBA, gl.FLOAT, P.data.subarray(0, Math.max(1, P.n) * 20));
    }

    // main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(progMain);
    const u = uMain;
    if (!useUBO) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, primTex); gl.uniform1i(u.uPrims, 0); }
    setU(u, 'uRes', w, h);
    setU(u, 'uCamPos', ...C.pos); setU(u, 'uCamF', ...C.f); setU(u, 'uCamR', ...C.r); setU(u, 'uCamU', ...C.u);
    setU(u, 'uFocal', C.F / F.H);
    gl.uniform1i(u.uNG, P.groups.length);
    const gmin = new Float32Array(MAXG * 3), gmax = new Float32Array(MAXG * 3), ginfo = new Int32Array(MAXG * 4);
    P.groups.forEach((g, i) => { gmin.set(g.mn, i * 3); gmax.set(g.mx, i * 3); ginfo.set([g.start, g.count, g.kind, 0], i * 4); });
    gl.uniform3fv(u.uGMin, gmin); gl.uniform3fv(u.uGMax, gmax); gl.uniform4iv(u.uGInfo, ginfo);
    const mats = new Float32Array(NMAT * 3), minfo = new Float32Array(NMAT * 4);
    RIG.MAT_KEYS.forEach((k, i) => {
      let c = hex(RIG.MATS[k]);
      if (o.pal) c = o.pal(c, 'shape', k);
      mats.set(c01(c), i * 3);
      minfo.set(MINFO[k] || [0.1, 0.6, 0, 0], i * 4);
    });
    gl.uniform3fv(u.uMat, mats); gl.uniform4fv(u.uMatInfo, minfo);
    const sky = S.sky;
    const sp = (c, role) => c01(o.pal ? o.pal(hex(c), role) : hex(c));
    setU(u, 'uSkyTop', ...sp(sky.top, 'sky')); setU(u, 'uSkyMid', ...sp(sky.mid, 'sky')); setU(u, 'uSkyHor', ...sp(sky.hor, 'sky'));
    setU(u, 'uSunDir', ...v3.norm(sky.sun)); setU(u, 'uSunCol', ...sp(sky.sunCol, 'sun'));
    setU(u, 'uLightDir', ...v3.norm(o.light || sky.light)); setU(u, 'uLightCol', ...sp(sky.lightCol, 'light'));
    setU(u, 'uAmb', ...sp(sky.amb, 'amb')); setU(u, 'uGround', ...sp(sky.ground, 'ground'));
    setU(u, 'uNight', sky.night >= 1 ? 1 : 0); setU(u, 'uTime', F.t); setU(u, 'uSunSize', sky.sunSize);
    setU(u, 'uPond', S.pond.c[0], S.pond.c[2], S.pond.rx, S.pond.rz);
    gl.uniform1i(u.uMode, MODES[o.mode] ?? 0);
    gl.uniform1i(u.uAllObj, o.allObj ? 1 : 0);
    gl.uniform1i(u.uDbg, o.dbg || 0);
    setU(u, 'uP', ...(o.p || [18, 1, 0, 0]));
    setU(u, 'uDisp', o.disp || 0); setU(u, 'uBlend', o.blend || 0); setU(u, 'uSeed', F.hold % 97);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // post pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(progPost);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCol); gl.uniform1i(uPost.uCol, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tAux); gl.uniform1i(uPost.uAux, 1);
    setU(uPost, 'uRes', w, h);
    let flags = 0;
    for (const f of o.post || []) flags |= POST[f] || 0;
    gl.uniform1i(uPost.uFlags, flags);
    setU(uPost, 'uTime', F.t); setU(uPost, 'uSeed', F.hold % 97);
    setU(uPost, 'uPP', ...(o.pp || [0.08, 9, 6 * (h / 720), 0.55]));
    setU(uPost, 'uLineCol', ...(o.lineCol || [0.06, 0.05, 0.08]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    return canvas;
  }

  return { render, MODES, available: () => init() };
})();
