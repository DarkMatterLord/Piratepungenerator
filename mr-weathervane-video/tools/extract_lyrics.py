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
        name, _, desc = m.group(1).partition(' - ')
        sections.append({'name': name.strip(), 'desc': desc.strip(), 'lines': []})
    else:
        sections[-1]['lines'].append(line)
json.dump(sections, open(out,'w'), indent=1, ensure_ascii=False)
for s in sections: print(f"{s['name']:28s} {len(s['lines'])} lines")
