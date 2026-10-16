import sys, json, re, wave
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
model_dir, wav, lyr, out, mode = sys.argv[1:6]
text = open(lyr).read()
lines = [l for l in text.split('\n') if l.strip() and not l.strip().endswith(':') and l.strip()!='---' and not l.startswith('(')]
words = sorted(set(w for l in lines for w in re.findall(r"[a-z']+", l.lower().replace('’',"'"))))
model = Model(model_dir)
wf = wave.open(wav, 'rb')
if mode == 'grammar':
    rec = KaldiRecognizer(model, wf.getframerate(), json.dumps(words + ["[unk]"]))
else:
    rec = KaldiRecognizer(model, wf.getframerate())
rec.SetWords(True)
res = []
while True:
    data = wf.readframes(4000)
    if len(data) == 0: break
    if rec.AcceptWaveform(data):
        r = json.loads(rec.Result()); res += r.get('result', [])
r = json.loads(rec.FinalResult()); res += r.get('result', [])
json.dump(res, open(out, 'w'))
# print compactly
line=[]; last=None
for w in res:
    if last is not None and w['start']-last > 0.8:
        print(f"{line[0]['start']:7.2f}-{line[-1]['end']:7.2f}: " + ' '.join(x['word'] for x in line)); line=[]
    line.append(w); last=w['end']
if line: print(f"{line[0]['start']:7.2f}-{line[-1]['end']:7.2f}: " + ' '.join(x['word'] for x in line))
