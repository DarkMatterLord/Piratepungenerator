"""Divinity - cinematic storyboard lyric video renderer.

Usage: python3 render.py <scratch_dir> <upload_dir> <frame_start> <frame_end> <out.mp4|preview_dir> [--png]
"""
import sys, json, math, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S, U = sys.argv[1], sys.argv[2]
F0, F1 = int(sys.argv[3]), int(sys.argv[4])
OUT = sys.argv[5]
PNG = '--png' in sys.argv
FPS = 30
OW, OH = 1920, 1080
SW, SH = 1586, 992
DUR = 272.832
NFR = int(round(DUR * FPS))

KJ = json.load(open(f'{S}/work/karaoke.json'))
AF = np.load(f'{S}/work/audiofeat.npz')
ENERGY = AF['energy']
BEATS = np.array(json.load(open(f'{S}/work/beats.json'))['beats'])

def clamp(x, a, b): return a if x < a else b if x > b else x
def ease(x):  # ease in-out sine
    x = clamp(x, 0.0, 1.0); return 0.5 - 0.5 * math.cos(math.pi * x)
def ease_out(x):
    x = clamp(x, 0.0, 1.0); return 1 - (1 - x) ** 3
def smooth(x):
    x = clamp(x, 0.0, 1.0); return x * x * (3 - 2 * x)

# ---------------------------------------------------------------- timeline
# (cut time, image key, transition, transition seconds, camera)
# camera: z0, z1, (fx0, fy0), (fx1, fy1), slam (initial extra zoom that eases off)
SHOTS = [
    (0.00,   '891ec891', 'black', 2.6, dict(z=(1.00, 1.24), f=((793, 496), (470, 430)))),
    (7.90,   'ca4f3a0a', 'dissolve', 1.2, dict(z=(1.00, 1.08), f=((793, 560), (640, 560)))),
    (20.45,  'f26f96d8', 'cut', 0, dict(z=(1.14, 1.00), f=((793, 470), (793, 496)), slam=0.10)),
    (26.11,  'f26f96d8', 'dissolve', 0.5, dict(z=(1.40, 1.50), f=((520, 420), (600, 380)))),
    (32.38,  'f26f96d8', 'dissolve', 0.5, dict(z=(1.42, 1.30), f=((1160, 430), (980, 430)))),
    (39.10,  'a250a646', 'dissolve', 0.6, dict(z=(1.00, 1.07), f=((793, 560), (700, 560)))),
    (44.45,  '7f022db9', 'dissolve', 0.5, dict(z=(1.08, 1.00), f=((650, 560), (793, 560)))),
    (49.40,  'b0297a00', 'dissolve', 0.5, dict(z=(1.00, 1.08), f=((793, 560), (900, 600)))),
    (54.50,  '879714d7', 'dissolve', 0.5, dict(z=(1.00, 1.12), f=((793, 560), (680, 600)))),
    (60.30,  '6c33824c', 'dissolve', 0.4, dict(z=(1.06, 1.06), f=((700, 560), (900, 560)))),
    (64.50,  '470f3458', 'dissolve', 0.4, dict(z=(1.00, 1.08), f=((793, 560), (700, 560)))),
    (70.30,  '13236040', 'cut', 0, dict(z=(1.12, 1.00), f=((600, 560), (793, 520)), slam=0.10)),
    (75.30,  'd06e75d1', 'dissolve', 0.3, dict(z=(1.00, 1.10), f=((793, 560), (620, 560)))),
    (80.65,  '860ca7f7', 'cut', 0, dict(z=(1.00, 1.10), f=((793, 560), (950, 560)))),
    (92.15,  'e9afa8d9', 'dissolve', 0.6, dict(z=(1.06, 1.06), f=((900, 560), (700, 560)))),
    (97.35,  '69888add', 'dissolve', 0.5, dict(z=(1.08, 1.00), f=((620, 560), (793, 560)))),
    (102.55, '70cf4ce6', 'dissolve', 0.5, dict(z=(1.00, 1.08), f=((793, 560), (600, 560)))),
    (107.60, 'ce91d9a8', 'dissolve', 0.5, dict(z=(1.00, 1.10), f=((793, 560), (1000, 560)))),
    (112.55, '3c7bece3', 'dissolve', 0.4, dict(z=(1.06, 1.06), f=((700, 560), (1000, 560)))),
    (117.25, 'af62f87d', 'dissolve', 0.4, dict(z=(1.00, 1.10), f=((793, 560), (1100, 560)))),
    (122.95, '665737cb', 'cut', 0, dict(z=(1.12, 1.00), f=((650, 560), (793, 520)), slam=0.10)),
    (128.10, 'b63e71e7', 'dissolve', 0.3, dict(z=(1.07, 1.07), f=((700, 560), (950, 560)))),
    (133.30, '9134d347', 'cut', 0, dict(z=(1.00, 1.12), f=((793, 560), (1050, 560)))),
    (143.60, '7caa84f6', 'cut', 0, dict(z=(1.05, 1.26), f=((793, 496), (640, 420)), slam=0.06)),
    (149.89, '19f54b6a', 'dissolve', 0.3, dict(z=(1.26, 1.05), f=((640, 420), (793, 496)))),
    (156.78, 'a3b9de68', 'cut', 0, dict(z=(1.00, 1.16), f=((793, 496), (700, 440)), slam=0.06)),
    (163.07, 'a3b9de68', 'cut', 0, dict(z=(1.48, 1.60), f=((470, 400), (520, 360)))),
    (168.72, '43055143', 'dissolve', 0.8, dict(z=(1.12, 1.00), f=((850, 430), (793, 496)))),
    (174.05, '2dce9e47', 'dip', 0.7, dict(z=(1.00, 1.08), f=((793, 560), (700, 560)))),
    (181.30, '85b1ce15', 'dissolve', 0.6, dict(z=(1.08, 1.00), f=((740, 560), (793, 560)))),
    (187.45, 'a02a8f9f', 'cut', 0, dict(z=(1.07, 1.07), f=((650, 560), (950, 560)), slam=0.05)),
    (192.70, '6c5bebd7', 'dissolve', 0.4, dict(z=(1.00, 1.10), f=((793, 560), (900, 560)))),
    (197.75, 'c7a7d44f', 'dissolve', 0.4, dict(z=(1.07, 1.07), f=((950, 560), (650, 560)))),
    (202.80, '858a9698', 'dissolve', 0.4, dict(z=(1.00, 1.10), f=((793, 560), (700, 560)))),
    (208.55, 'f558e2be', 'cut', 0, dict(z=(1.14, 1.00), f=((700, 560), (793, 520)), slam=0.10)),
    (213.45, 'a35ca324', 'dissolve', 0.3, dict(z=(1.00, 1.10), f=((793, 560), (600, 560)))),
    (218.85, '221f5497', 'cut', 0, dict(z=(1.07, 1.07), f=((900, 560), (650, 560)))),
    (229.15, 'dbf73416', 'dissolve', 1.0, dict(z=(1.00, 1.07), f=((793, 560), (700, 560)))),
    (238.55, '835f673a', 'dissolve', 1.0, dict(z=(1.07, 1.00), f=((760, 560), (793, 560)))),
    (251.78, 'ba879fbe', 'dissolve', 1.0, dict(z=(1.00, 1.12), f=((793, 560), (650, 560)))),
    (259.36, 'ee6f43da', 'cut', 0, dict(z=(1.02, 1.22), f=((793, 496), (740, 470)), slam=0.08)),
]
ENDT = DUR

# flashes: (time, strength, decay s, color BGR)
VIOLET = (255, 150, 215); WHITE = (255, 235, 245); RED = (90, 70, 255)
FLASH = [(20.45, 1.0, 0.65, WHITE), (70.30, 0.9, 0.5, WHITE), (122.95, 0.9, 0.5, WHITE),
         (208.55, 0.95, 0.5, WHITE), (143.60, 0.8, 0.5, VIOLET), (149.89, 0.35, 0.35, VIOLET),
         (156.78, 0.5, 0.4, VIOLET), (163.07, 0.4, 0.35, VIOLET), (54.5, 0.35, 0.6, RED),
         (117.25, 0.35, 0.6, RED), (218.85, 0.45, 0.45, RED), (80.65, 0.4, 0.45, RED),
         (133.30, 0.4, 0.45, VIOLET), (183.47, 0.45, 0.5, VIOLET), (186.28, 0.45, 0.5, VIOLET),
         (187.45, 0.5, 0.45, VIOLET), (259.36, 1.0, 1.1, WHITE), (173.50, 0.3, 0.3, VIOLET)]
SHAKE = [(20.45, 20, 0.55), (70.30, 16, 0.5), (122.95, 16, 0.5), (208.55, 18, 0.5), (143.60, 12, 0.45),
         (156.78, 8, 0.4), (183.47, 9, 0.45), (186.28, 9, 0.45), (187.45, 9, 0.4), (259.36, 14, 0.8)]
# emphasised (capitalised) sung words get a pulse + small shake
for k, g in KJ.items():
    for w in g['words']:
        if w['emph']:
            FLASH.append((w['t'], 0.22, 0.28, VIOLET)); SHAKE.append((w['t'], 6, 0.3))
FLASH = sorted(set(FLASH)); SHAKE = sorted(set(SHAKE))

def flash_at(t):
    acc = np.zeros(3, np.float32)
    for (ft, s, d, c) in FLASH:
        if 0 <= t - ft < d * 5:
            acc += s * math.exp(-(t - ft) / d) * np.array(c, np.float32)
    return acc

def shake_at(t):
    dx = dy = rot = 0.0
    for (st, a, d) in SHAKE:
        u = t - st
        if 0 <= u < d * 5:
            e = a * math.exp(-u / d)
            dx += e * math.sin(u * 71.0 + st) ; dy += e * math.sin(u * 53.0 + 1.3 * st)
            rot += e * 0.012 * math.sin(u * 37.0 + st)
    return dx, dy, rot

def beat_pulse(t):
    i = np.searchsorted(BEATS, t)
    p = 0.0
    for j in (i - 1, i - 2):
        if 0 <= j < len(BEATS):
            u = t - BEATS[j]
            if u >= 0: p = max(p, math.exp(-u / 0.16))
    return p

# ---------------------------------------------------------------- assets
_img_cache = {}
def load_src(key):
    if key not in _img_cache:
        im = cv2.imread(f'{U}/{key}-image.png')
        d = None
        if key in KJ:
            z = np.load(f'{S}/prep/{key}.npz')
            y0, y1 = int(z['y0']), int(z['y1'])
            reg = im[y0:y1].astype(np.float32)
            clean = z['clean'].astype(np.float32)
            d = dict(y0=y0, y1=y1, clean=clean, diff=reg - clean, wid=z['wid'].astype(np.int32),
                     words=KJ[key]['words'],
                     cap=(min(l['x0'] for l in KJ[key]['lines']), min(l['y0'] for l in KJ[key]['lines']),
                          max(l['x1'] for l in KJ[key]['lines']), max(l['y1'] for l in KJ[key]['lines'])))
        _img_cache[key] = (im, d)
        if len(_img_cache) > 6:
            _img_cache.pop(next(iter(_img_cache)))
    return _img_cache[key]

DIM = 0.34
def karaoke(im, d, t):
    """Composite the caption region: ghosted until sung, then lit with a glow pulse."""
    ws = d['words']; n = len(ws)
    fv = np.ones(n + 1, np.float32); gv = np.zeros(n + 1, np.float32)
    for i, w in enumerate(ws):
        u = t - w['t']
        lit = smooth((u + 0.10) / 0.22)
        pulse = math.exp(-u / 0.55) if u >= 0 else 0.0
        boost = (0.55 if w['emph'] else 0.32) * pulse
        fv[i] = DIM + (1 - DIM) * lit + boost
        gv[i] = 0.30 * lit + (1.6 if w['emph'] else 0.9) * pulse
    F = fv[d['wid']]  # wid==-1 -> last entry (1.0)
    Gm = gv[d['wid']]
    reg = d['clean'] + d['diff'] * F[..., None]
    if gv.max() > 0.01:
        glow_src = np.maximum(d['diff'], 0) * Gm[..., None]
        glow = cv2.GaussianBlur(glow_src, (0, 0), 7) * 1.8 + cv2.GaussianBlur(glow_src, (0, 0), 2.5) * 0.6
        reg = reg + glow
    out = im.copy()
    out[d['y0']:d['y1']] = np.clip(reg, 0, 255).astype(np.uint8)
    return out

def camera(shot_idx, t):
    st, key, tr, td, cam = SHOTS[shot_idx]
    en = SHOTS[shot_idx + 1][0] if shot_idx + 1 < len(SHOTS) else ENDT
    nxt_td = SHOTS[shot_idx + 1][3] if shot_idx + 1 < len(SHOTS) else 0
    a = st - (td / 2 if tr in ('dissolve',) else 0)
    b = en + nxt_td / 2
    x = ease((t - a) / max(0.1, b - a))
    z = cam['z'][0] + (cam['z'][1] - cam['z'][0]) * x
    fx = cam['f'][0][0] + (cam['f'][1][0] - cam['f'][0][0]) * x
    fy = cam['f'][0][1] + (cam['f'][1][1] - cam['f'][0][1]) * x
    if cam.get('slam'):
        z *= 1 + cam['slam'] * (1 - ease_out((t - st) / 0.75)) if t >= st else 1 + cam['slam']
    return z, fx, fy

def frame_for_shot(shot_idx, t, extra_zoom, sh):
    st, key, tr, td, cam = SHOTS[shot_idx]
    im, d = load_src(key)
    z, fx, fy = camera(shot_idx, t)
    z *= extra_zoom
    w = SW / z; h = w * OH / OW
    if h > SH: h = SH; w = h * OW / OH
    cx = clamp(fx, w / 2, SW - w / 2); cy = clamp(fy, h / 2, SH - h / 2)
    if d is not None:
        x0c, y0c, x1c, y1c = d['cap']
        need_bot = min(SH, y1c + 42); need_top = y0c - 40
        cy = max(cy, need_bot - h / 2); cy = min(cy, need_top + h / 2)
        lo = x1c + 30 - w / 2; hi = x0c - 30 + w / 2
        cx = clamp(cx, lo, hi) if lo <= hi else (lo + hi) / 2
        cx = clamp(cx, w / 2, SW - w / 2); cy = clamp(cy, h / 2, SH - h / 2)
        src = karaoke(im, d, t)
    else:
        src = im
    s = OW / w
    dx, dy, rot = sh
    M = cv2.getRotationMatrix2D((cx, cy), rot, s)
    M[0, 2] += OW / 2 - cx + dx
    M[1, 2] += OH / 2 - cy + dy
    return cv2.warpAffine(src, M, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)

# ---------------------------------------------------------------- overlays
yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
rr = np.sqrt(((xx - OW / 2) / (OW * 0.62)) ** 2 + ((yy - OH / 2) / (OH * 0.70)) ** 2)
VIGN = np.clip(1.0 - 0.36 * np.clip(rr - 0.55, 0, 1) ** 1.6 * 2.2, 0.55, 1.0)
VIGN3 = cv2.merge([VIGN, VIGN, VIGN])
del yy, xx, rr

# particles at half resolution
PW, PH = OW // 2, OH // 2
rng = np.random.default_rng(7)
NP = 220
P = dict(x=rng.uniform(0, PW, NP), y=rng.uniform(0, PH, NP), vy=-rng.uniform(6, 26, NP),
         sway=rng.uniform(4, 18, NP), fr=rng.uniform(0.05, 0.3, NP), ph=rng.uniform(0, 6.28, NP),
         sz=rng.choice([0, 0, 0, 1, 1, 2, 3], NP), br=rng.uniform(0.35, 1.0, NP),
         tw=rng.uniform(0.6, 2.4, NP), col=rng.choice(3, NP, p=[0.55, 0.3, 0.15]),
         order=rng.permutation(NP))
PCOL = np.array([[255, 140, 200], [120, 200, 255], [255, 230, 240]], np.float32)  # BGR violet, gold, white
SPR = []
for sig in (0.8, 1.3, 2.0, 3.2):
    r = int(math.ceil(sig * 3)); g = np.arange(-r, r + 1, dtype=np.float32)
    k = np.exp(-(g[:, None] ** 2 + g[None, :] ** 2) / (2 * sig * sig)); SPR.append(k)

def particles(t, amount):
    layer = np.zeros((PH, PW, 3), np.float32)
    nact = int(NP * clamp(amount, 0, 1))
    if nact <= 0: return None
    idx = P['order'][:nact]
    ys = (P['y'][idx] + P['vy'][idx] * t) % (PH + 30) - 15
    xs = (P['x'][idx] + P['sway'][idx] * np.sin(2 * math.pi * P['fr'][idx] * t + P['ph'][idx]) + 3 * t) % PW
    tw = 0.55 + 0.45 * np.sin(t * P['tw'][idx] * 2 * math.pi + P['ph'][idx] * 3)
    for j, i in enumerate(idx):
        k = SPR[P['sz'][i]]; r = k.shape[0] // 2
        x, y = int(xs[j]), int(ys[j])
        if x - r < 0 or y - r < 0 or x + r + 1 > PW or y + r + 1 > PH: continue
        c = PCOL[P['col'][i]] * (P['br'][i] * tw[j] * 0.9)
        layer[y - r:y + r + 1, x - r:x + r + 1] += k[..., None] * c
    return layer

# title
def make_title(size, tracking):
    font = ImageFont.truetype(f'{S}/fonts/CinzelDecorative-Bold.ttf', size)
    text = 'DIVINITY'
    adv = [font.getlength(ch) for ch in text]
    W = int(sum(adv) + tracking * (len(text) - 1) + size * 1.2); H = int(size * 2.2)
    def draw(stroke):
        im = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(im); x = size * 0.6
        for ch, a in zip(text, adv):
            dr.text((x, size * 0.42), ch, font=font, fill=255, stroke_width=stroke, stroke_fill=255); x += a + tracking
        return np.asarray(im).astype(np.float32) / 255
    fillm = draw(0); strokem = draw(max(2, size // 40))
    orn = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(orn)
    cy = int(size * 1.72); cxm = W // 2; lw = max(2, size // 55)
    dr.line([(cxm - W * 0.40, cy), (cxm - size * 0.30, cy)], fill=255, width=lw)
    dr.line([(cxm + size * 0.30, cy), (cxm + W * 0.40, cy)], fill=255, width=lw)
    rr_ = size // 10
    dr.ellipse([cxm - rr_, cy - rr_, cxm + rr_, cy + rr_], outline=255, width=lw)
    for sgn in (-1, 1):
        dr.polygon([(cxm + sgn * size * 0.26, cy), (cxm + sgn * size * 0.17, cy - size * 0.05), (cxm + sgn * size * 0.17, cy + size * 0.05)], fill=255)
    ornm = np.asarray(orn).astype(np.float32) / 255
    grad = np.linspace(0, 1, H)[:, None, None]
    top = np.array([255, 236, 250], np.float32); bot = np.array([240, 120, 190], np.float32)  # BGR lavender -> violet
    fill = np.broadcast_to(top * (1 - grad) + bot * grad, (H, W, 3)).copy()
    gold = np.array([110, 195, 250], np.float32)
    rim = np.clip(strokem - fillm, 0, 1)
    allm = np.clip(strokem + ornm, 0, 1)
    shadow = np.clip(cv2.GaussianBlur(allm, (0, 0), size * 0.10) * 1.8, 0, 1)
    glow = cv2.GaussianBlur(fillm + ornm * 0.6, (0, 0), size * 0.16)
    glow2 = cv2.GaussianBlur(fillm, (0, 0), size * 0.04)
    # pre-compose colour + alpha
    col = fill * fillm[..., None] + gold * rim[..., None] + gold * ornm[..., None] * (1 - fillm[..., None])
    alpha = np.clip(fillm + rim + ornm, 0, 1)
    return dict(col=col, a=alpha, shadow=shadow, glow=glow, glow2=glow2, W=W, H=H)

TITLE_BIG = make_title(170, 30)

def draw_title(frame_f, T, alpha, scale, cx, cy):
    if alpha <= 0.003: return
    col, a_, sh, glow, glow2 = T['col'], T['a'], T['shadow'], T['glow'], T['glow2']
    if abs(scale - 1) > 1e-3:
        W2, H2 = int(T['W'] * scale), int(T['H'] * scale)
        col = cv2.resize(col, (W2, H2)); a_ = cv2.resize(a_, (W2, H2)); sh = cv2.resize(sh, (W2, H2))
        glow = cv2.resize(glow, (W2, H2)); glow2 = cv2.resize(glow2, (W2, H2))
    h, w = a_.shape
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    xa, ya = max(0, x0), max(0, y0); xb, yb = min(OW, x0 + w), min(OH, y0 + h)
    if xa >= xb or ya >= yb: return
    sl = (slice(ya, yb), slice(xa, xb)); ss = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
    region = frame_f[sl]
    region *= (1 - 0.80 * alpha * sh[ss])[..., None]
    region += ((glow[ss] * 1.0 + glow2[ss] * 0.7) * alpha)[..., None] * np.array([255, 100, 185], np.float32)
    a = (a_[ss] * alpha)[..., None]
    region[:] = region * (1 - a) + col[ss] * a

# ---------------------------------------------------------------- frame assembly
def shot_at(t):
    i = 0
    while i + 1 < len(SHOTS) and SHOTS[i + 1][0] <= t: i += 1
    return i

def render(n):
    t = n / FPS
    i = shot_at(t)
    E = float(ENERGY[min(n, len(ENERGY) - 1)])
    bp = beat_pulse(t) * E
    sh = shake_at(t)
    ez = 1.0 + 0.010 * bp
    frame = frame_for_shot(i, t, ez, sh)
    # transition with previous shot (centred on cut) or next shot
    st, key, tr, td, cam = SHOTS[i]
    if tr == 'dissolve' and t < st + td / 2 and i > 0:
        w = smooth((t - (st - td / 2)) / td)
        prev = frame_for_shot(i - 1, t, ez, sh)
        frame = cv2.addWeighted(prev, 1 - w, frame, w, 0)
    elif i + 1 < len(SHOTS) and SHOTS[i + 1][2] == 'dissolve' and t >= SHOTS[i + 1][0] - SHOTS[i + 1][3] / 2:
        nst, _, _, ntd, _ = SHOTS[i + 1]
        w = smooth((t - (nst - ntd / 2)) / ntd)
        nxt = frame_for_shot(i + 1, t, ez, sh)
        frame = cv2.addWeighted(frame, 1 - w, nxt, w, 0)
    f = frame.astype(np.float32)
    # bloom
    small = cv2.resize(frame, (OW // 4, OH // 4), interpolation=cv2.INTER_AREA).astype(np.float32)
    lum = small.max(axis=2, keepdims=True)
    bright = small * np.clip((lum - 150) / 105, 0, 1)
    bloom = cv2.GaussianBlur(bright, (0, 0), 7)
    bgain = 0.20 + 0.28 * bp + 0.12 * E
    f += cv2.resize(bloom, (OW, OH), interpolation=cv2.INTER_LINEAR) * bgain
    # particles
    amt = 0.25 + 0.75 * E
    pl = particles(t, amt)
    if pl is not None:
        f += cv2.resize(pl, (OW, OH), interpolation=cv2.INTER_LINEAR)
    # flash
    fl = flash_at(t)
    if fl.max() > 0.5:
        f += fl[None, None, :] * 0.85
    # title cards
    if 20.45 <= t < 28.0:
        u = t - 20.45
        alpha = 1.0 if u < 5.6 else 1 - smooth((u - 5.6) / 1.6)
        scale = 1.0 + 0.35 * (1 - ease_out(u / 0.4)) + 0.04 * u / 7.5
        draw_title(f, TITLE_BIG, alpha, scale, OW / 2, OH * 0.41)
    if t >= 261.6:
        u = t - 261.6
        alpha = smooth(u / 2.2)
        scale = 0.80 - 0.03 * smooth(u / 9)
        draw_title(f, TITLE_BIG, alpha, scale, OW / 2, OH * 0.27)
    f *= VIGN3
    # fades
    fade = 1.0
    if t < 2.6: fade = smooth(t / 2.6)
    if 173.65 <= t < 174.65:  # dip to black into the interlude
        u = (t - 173.65) / 1.0; fade = abs(1 - 2 * smooth(u)) ** 1.3
    if t > DUR - 2.6: fade = min(fade, smooth((DUR - t) / 2.4))
    if fade < 1: f *= fade
    return np.clip(f, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    if PNG:
        import os; os.makedirs(OUT, exist_ok=True)
        for n in range(F0, F1):
            cv2.imwrite(f'{OUT}/f{n:05d}.jpg', render(n), [cv2.IMWRITE_JPEG_QUALITY, 88])
    else:
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{OW}x{OH}', '-r', str(FPS),
               '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'film', '-pix_fmt', 'yuv420p',
               '-x264-params', 'keyint=60:min-keyint=30', '-threads', '2', OUT]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        import time; t0 = time.time()
        for n in range(F0, F1):
            p.stdin.write(render(n).tobytes())
            if (n - F0) % 300 == 0:
                print(f'[{F0}-{F1}] frame {n} {(n - F0 + 1) / (time.time() - t0):.1f} fps', flush=True)
        p.stdin.close(); p.wait()
        print('done', OUT, flush=True)
