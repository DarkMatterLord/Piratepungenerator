import json, re, difflib, sys
LYR = "/home/user/Piratepungenerator/BearVsRabbit_MusicVideo/data/lyrics.txt"
chunks = json.load(open(sys.argv[1] if len(sys.argv)>1 else "asr_chunks.json"))
W, H, M = 24.0, 16.0, 4.0
# ---- merge chunk tokens, keeping each token from the chunk where it is most central
toks = []
for i, c in enumerate(chunks):
    lo = c["start"] + (0 if i == 0 else M)
    hi = c["start"] + W - M if i < len(chunks) - 1 else 1e9
    for t, ts in zip(c["tokens"], c["ts"]):
        if lo <= ts < hi:
            toks.append((t, ts))
# tokens -> words
words = []
for t, ts in toks:
    if t.startswith(" ") or not words:
        words.append([t.strip(), ts, ts])
    else:
        words[-1][0] += t; words[-1][2] = ts
def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())
asr = [(norm(w), a, b, w) for w, a, b in words if norm(w)]
# ---- lyrics
sections, lines = [], []
for raw in open(LYR, encoding="utf-8").read().splitlines():
    raw = raw.strip()
    if not raw: continue
    if raw.startswith("["):
        sections.append({"title": raw.strip("[]"), "first_line": len(lines)}); continue
    lines.append({"text": raw, "section": len(sections) - 1})
lw = []  # (lineidx, display word, norm)
for li, L in enumerate(lines):
    toks_disp = L["text"].split()
    L["words"] = []
    for wd in toks_disp:
        # split on em-dash for timing but keep display intact per token
        parts = [p for p in re.split(r"[—\-]", wd) if norm(p)]
        L["words"].append({"w": wd, "n": [norm(p) for p in parts]})
        for p in parts:
            lw.append((li, len(L["words"]) - 1, norm(p)))
# ---- Needleman-Wunsch alignment
A = [x[2] for x in lw]; B = [x[0] for x in asr]
n, m = len(A), len(B)
def sim(a, b):
    if a == b: return 2.0
    r = difflib.SequenceMatcher(None, a, b).ratio()
    return 1.2 * r if r >= 0.6 else -1.0
GAP = -0.6
import numpy as np
S = np.zeros((n + 1, m + 1)); P = np.zeros((n + 1, m + 1), dtype=np.int8)
S[:, 0] = np.arange(n + 1) * GAP; S[0, :] = np.arange(m + 1) * GAP; P[1:, 0] = 1; P[0, 1:] = 2
for i in range(1, n + 1):
    for j in range(1, m + 1):
        d = S[i-1, j-1] + sim(A[i-1], B[j-1]); u = S[i-1, j] + GAP; l = S[i, j-1] + GAP
        if d >= u and d >= l: S[i, j] = d; P[i, j] = 0
        elif u >= l: S[i, j] = u; P[i, j] = 1
        else: S[i, j] = l; P[i, j] = 2
i, j = n, m; match = [None] * n
while i > 0 or j > 0:
    p = P[i, j]
    if i > 0 and j > 0 and p == 0:
        if sim(A[i-1], B[j-1]) > 0: match[i-1] = j-1
        i -= 1; j -= 1
    elif i > 0 and (j == 0 or p == 1): i -= 1
    else: j -= 1
times = [asr[k][1] if k is not None else None for k in match]
print("matched", sum(t is not None for t in times), "of", n)
# interpolate unmatched
idx = [k for k, t in enumerate(times) if t is not None]
for k in range(n):
    if times[k] is None:
        prev = max([q for q in idx if q < k], default=None); nxt = min([q for q in idx if q > k], default=None)
        if prev is None: times[k] = times[nxt] - 0.25 * (nxt - k)
        elif nxt is None: times[k] = times[prev] + 0.25 * (k - prev)
        else: times[k] = times[prev] + (times[nxt] - times[prev]) * (k - prev) / (nxt - prev)
# enforce monotonic
for k in range(1, n):
    if times[k] < times[k-1] + 0.03: times[k] = times[k-1] + 0.03
# write back: word start = first part's time
for (li, wi, _), t in zip(lw, times):
    W_ = lines[li]["words"][wi]
    if "t" not in W_: W_["t"] = round(t, 3)
# manual fixes where ASR missed words (checked against vocal energy)
OVERRIDES = {("Aw, Saint Teddy's back!", 0): 234.05, ("Aw, Saint Teddy's back!", 1): 234.85, ("Aw, Saint Teddy's back!", 2): 235.65}
for li, L in enumerate(lines):
    for (pre, wi), t in OVERRIDES.items():
        if L["text"].startswith(pre): L["words"][wi]["t"] = t
for li, L in enumerate(lines):
    L["start"] = L["words"][0]["t"]
for li, L in enumerate(lines):
    nxt = lines[li + 1]["start"] if li + 1 < len(lines) else L["words"][-1]["t"] + 1.2
    L["end"] = round(min(nxt, L["words"][-1]["t"] + 1.6), 3)
    for w in L["words"]: w.pop("n", None)
for s_i, s in enumerate(sections):
    s["start"] = lines[s["first_line"]]["start"]
    s["speaker"] = "ted" if "TED" in s["title"] else "floppy"
for L in lines: L["speaker"] = sections[L["section"]]["speaker"]
json.dump({"sections": sections, "lines": lines}, open("/home/user/Piratepungenerator/BearVsRabbit_MusicVideo/data/timing.json", "w"), indent=1)
for li, L in enumerate(lines):
    unm = sum(1 for (l2, _, _), mt in zip(lw, match) if l2 == li and mt is None)
    print(f"{L['start']:7.2f}-{L['end']:7.2f} [{unm}] {L['text'][:70]}")
