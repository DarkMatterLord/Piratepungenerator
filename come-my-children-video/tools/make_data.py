"""Merge lyric timing + audio features into data.js for the renderer.

Usage: python3 make_data.py timing.json features.json vocal_env.npy out/data.js [overrides.json]
overrides.json: [["Section", line_idx, word_idx, time_s], ...] for words Whisper timed badly.
"""
import sys, json, numpy as np

timing_p, feat_p, voc_p, out_p = sys.argv[1:5]
T = json.load(open(timing_p))
F = json.load(open(feat_p))
fps = F['fps']

# Manual corrections where Whisper put the first word after an instrumental too early
# (checked against the vocal-energy envelope). Key: (section name, line idx, word idx).
OVERRIDES = {}
if len(sys.argv) > 5:
    OVERRIDES = {(a, b, c): t for a, b, c, t in json.load(open(sys.argv[5]))}
lines = T['lines']
by_sec = {}
for L in lines:
    key = (L['section'], by_sec.setdefault(L['section'], {}).setdefault(L['sec'], len(by_sec[L['section']])))
for L in lines:
    sec_lines = [x for x in lines if x['section'] == L['section'] and x['sec'] == L['sec']]
    li = sec_lines.index(L)
    for wi, w in enumerate(L['words']):
        k = (L['section'], li, wi)
        if k in OVERRIDES:
            w['t'] = OVERRIDES[k]
for L in lines:
    L['start'] = L['words'][0]['t']
for i, L in enumerate(lines):
    last = L['words'][-1]['t']
    nxt = lines[i + 1]['start'] if i + 1 < len(lines) else last + 2.5
    L['end'] = round(min(nxt - 0.05, last + 1.6), 2)

# vocal envelope (REPET-SIM estimate, hop 512 @ 22050) -> fps
voc = np.load(voc_p)
vt = np.arange(len(voc)) * 512 / 22050
n = len(F['rms'])
grid = np.arange(n) / fps
v = np.interp(grid, vt, voc)
v = np.clip(v / np.percentile(v, 98), 0, 1)
# gate to sung lines so mouths rest during instrumentals
gate = np.zeros(n)
for L in lines:
    a, b = int(L['start'] * fps) - 2, int((L['end'] + 0.2) * fps)
    gate[max(a, 0):min(b, n)] = 1
v = v * gate

out = {
    'duration': F['duration'], 'fps': fps, 'tempo': F['tempo'], 'beats': F['beats'],
    'rms': F['rms'], 'bass': F['bass'], 'mid': F['mid'], 'high': F['high'], 'onset': F['onset'],
    'voc': [round(float(x), 2) for x in v],
    'lines': [{'s': L['start'], 'e': L['end'], 'sec': L['section'], 'text': L['text'],
               'words': [{'w': w['w'], 't': w['t']} for w in L['words']]} for L in lines],
}
with open(out_p, 'w') as f:
    f.write('window.MV_DATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print('lines', len(lines), 'frames', n, 'bytes', sum(1 for _ in open(out_p)))
for L in lines[:4] + lines[31:33] + lines[-2:]:
    print(f"{L['start']:7.2f}-{L['end']:7.2f} {L['text'][:60]}")
