import sys, json, subprocess, re
src = sys.argv[1]; out = sys.argv[2]
meta = json.loads(subprocess.check_output(['ffprobe','-v','quiet','-print_format','json','-show_format', src]))
tags = meta['format']['tags']
lyr = next(v for k,v in tags.items() if k.lower().startswith('lyrics'))
sections = []
for raw in lyr.splitlines():
    line = raw.strip()
    if not line: continue
    m = re.match(r'^\[(.+?)\]$', line)
    if m:
        tag = m.group(1)
        sep = ' - ' if ' - ' in tag else ': ' if ': ' in tag else None
        name, desc = (tag.split(sep, 1) if sep else (tag, ''))
        sections.append({'name': name.strip(), 'desc': desc.strip(), 'lines': []})
    else:
        # a long line holding several sung sentences is split so each shows on its own
        parts = re.split(r'(?<=[.!?—])\s+(?=[A-Z])', line) if len(line) > 70 else [line]
        sections[-1]['lines'].extend(p.strip() for p in parts if p.strip())
json.dump(sections, open(out,'w'), indent=1, ensure_ascii=False)
for s in sections: print(f"{s['name']:28s} {len(s['lines'])} lines")
