import sys, time, importlib.util, cv2
S,U=sys.argv[1],sys.argv[2]; times=[float(x) for x in sys.argv[3].split(',')]; out=sys.argv[4]
sys.argv=['render.py',S,U,'0','1','/dev/null']
spec=importlib.util.spec_from_file_location('r',f'{S}/work/render.py'); r=importlib.util.module_from_spec(spec); spec.loader.exec_module(r)
import os; os.makedirs(out,exist_ok=True)
t0=time.time()
for t in times:
    n=int(round(t*30)); im=r.render(n)
    cv2.imwrite(f'{out}/t{t:07.2f}.jpg', cv2.resize(im,(960,540),interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY,85])
print('per frame', (time.time()-t0)/len(times))
