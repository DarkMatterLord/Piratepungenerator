"""Align the official lyric lines (from the MP3's metadata) to Whisper word timestamps.

Usage: python3 build_timing.py lyrics.json out.json asr_main.json[:t0:t1] [asr_window.json:t0:t1 ...]
Each ASR file contributes only words whose start time lies in [t0, t1).
"""
import sys, json, re, difflib

lyr_path, out_path, *asr_specs = sys.argv[1:]
sections = json.load(open(lyr_path))

def norm(w):
    w = w.lower().replace('’', "'")
    w = re.sub(r"[^a-z0-9']", '', w)
    return {'9': 'nine', 'mr': 'mister'}.get(w, w)

asr = []
for spec in asr_specs:
    path, *rng = spec.split(':')
    t0, t1 = (float(rng[0]), float(rng[1])) if rng else (-1, 1e9)
    for c in json.load(open(path))['chunks']:
        s = c['timestamp'][0]
        w = norm(c['text'].strip())
        if w and s is not None and t0 <= s < t1:
            asr.append((s, w))
asr.sort()

ref = []  # (section_idx, line_idx, display_word, norm_word)
for si, s in enumerate(sections):
    for li, line in enumerate(s['lines']):
        for tok in line.replace('—', ' ').split():
            n = norm(tok.replace('-', ''))
            if n:
                ref.append((si, li, tok, n))

def sim(a, b):
    if a == b: return 3
    r = difflib.SequenceMatcher(None, a, b).ratio()
    return 1.5 if r >= 0.6 else -1.5

R, A = len(ref), len(asr)
GAP = -1.0
score = [[0.0] * (A + 1) for _ in range(R + 1)]
back = [[0] * (A + 1) for _ in range(R + 1)]
for i in range(1, R + 1): score[i][0] = i * GAP; back[i][0] = 1
for j in range(1, A + 1): score[0][j] = j * GAP; back[0][j] = 2
for i in range(1, R + 1):
    for j in range(1, A + 1):
        d = score[i-1][j-1] + sim(ref[i-1][3], asr[j-1][1])
        u = score[i-1][j] + GAP
        l = score[i][j-1] + GAP
        best = max(d, u, l)
        score[i][j] = best
        back[i][j] = 0 if best == d else (1 if best == u else 2)
times = [None] * R
i, j = R, A
while i > 0 and j > 0:
    b = back[i][j]
    if b == 0:
        if sim(ref[i-1][3], asr[j-1][1]) > 0: times[i-1] = asr[j-1][0]
        i -= 1; j -= 1
    elif b == 1: i -= 1
    else: j -= 1
# interpolate unmatched words
known = [k for k, t in enumerate(times) if t is not None]
for k in range(R):
    if times[k] is None:
        prev = max([p for p in known if p < k], default=None)
        nxt = min([p for p in known if p > k], default=None)
        if prev is not None and nxt is not None:
            times[k] = times[prev] + (times[nxt] - times[prev]) * (k - prev) / (nxt - prev)
        elif prev is not None: times[k] = times[prev] + 0.3 * (k - prev)
        else: times[k] = times[nxt] - 0.3 * (nxt - k)
# enforce monotonic
for k in range(1, R):
    if times[k] < times[k-1]: times[k] = times[k-1] + 0.05
matched = sum(1 for k in known)
lines = []
for k, (si, li, tok, n) in enumerate(ref):
    if not lines or lines[-1]['sec'] != si or lines[-1]['line'] != li:
        lines.append({'sec': si, 'line': li, 'section': sections[si]['name'], 'text': sections[si]['lines'][li], 'words': []})
    lines[-1]['words'].append({'w': tok, 't': round(times[k], 2), 'm': k in known})
for L in lines:
    L['start'] = L['words'][0]['t']
for idx, L in enumerate(lines):
    last = L['words'][-1]['t']
    nxt = lines[idx + 1]['start'] if idx + 1 < len(lines) else last + 2.5
    L['end'] = round(min(nxt - 0.05, last + 1.6), 2)
json.dump({'sections': [{'name': s['name'], 'desc': s['desc']} for s in sections], 'lines': lines}, open(out_path, 'w'), indent=1)
print(f'matched {matched}/{R} words')
for L in lines:
    miss = sum(1 for w in L['words'] if not w['m'])
    print(f"{L['start']:7.2f}-{L['end']:7.2f} {miss:2d}? [{L['section'][:10]:10s}] {L['text'][:80]}")
