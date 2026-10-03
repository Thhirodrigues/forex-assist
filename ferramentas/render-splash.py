"""Re-renderiza a splash (AJUSTE-070): escala 100% -> 80% (1,9-2,5 s) -> 75% (4,0-4,8 s) e
escrito 28% menor a partir de ~5,3 s. Entrada: splash-original.mp4 (video enviado pelo usuario,
nao versionado). Dependencias: av, numpy, opencv-python-headless, pillow."""
import av, numpy as np, cv2
from PIL import Image
from fractions import Fraction
SRC="splash-original.mp4"; OUT="assets/splash.mp4"
BG=np.array([10,25,35],dtype=np.float32)
W,H=360,640
def sstep(a,b,t):
    x=min(1,max(0,(t-a)/(b-a))); return x*x*(3-2*x)
def escala(t):
    return 1.0 + (0.80-1.0)*sstep(1.9,2.5,t) + (0.75-0.80)*sstep(4.0,4.8,t)
KT=0.72
def texto(arr,t,n):
    a=sstep(5.2,5.4,t)
    if a<=0: return arr
    BY0=int(YMs[n])+5; BY1=min(H-1,BY0+110); ANC=22
    band=arr[BY0:BY1].astype(np.uint8)
    mask=(band.max(axis=2)>60).astype(np.uint8)*255
    mask=cv2.dilate(mask,np.ones((7,7),np.uint8))
    bg=cv2.inpaint(band,mask,3,cv2.INPAINT_TELEA).astype(np.float32)
    layer=np.clip(band.astype(np.float32)-bg,0,255)
    h=BY1-BY0
    w2,h2=round(W*KT),round(h*KT)
    ls=cv2.resize(layer,(w2,h2),interpolation=cv2.INTER_AREA)
    newl=np.zeros_like(layer); x0=(W-w2)//2; y0=round(ANC*(1-KT))
    hh=min(h2,h-y0); newl[y0:y0+hh,x0:x0+w2]=ls[:hh]
    proc=np.clip(bg+newl,0,255)
    out=arr.copy()
    out[BY0:BY1]=band.astype(np.float32)*(1-a)+proc*a
    return out
def ymax_ouro(a):
    g=(a[...,0]>150)&(a[...,1]>110)&(a[...,2]<110)
    ys=np.where(g.sum(axis=1)>1)[0]
    return int(ys.max()) if len(ys) else 0
YM=[]
for f in av.open(SRC).decode(video=0):
    YM.append(ymax_ouro(f.to_ndarray(format="rgb24")))
YM=np.array(YM,dtype=float)
k=5; pad=np.pad(YM,(k,k),mode="edge"); YMs=np.array([np.median(pad[i:i+2*k+1]) for i in range(len(YM))])
print("ymax suavizado:",[int(YMs[i]) for i in (130,140,150,160,170,185)])
src=av.open(SRC)
out=av.open(OUT,"w",options={"movflags":"+faststart"})
ov=out.add_stream("libx264",rate=24); ov.width=W; ov.height=H; ov.pix_fmt="yuv420p"
ov.options={"crf":"17","preset":"slow","profile":"high"}
oa=out.add_stream_from_template(src.streams.audio[0])
n=0
for f in src.decode(video=0):
    t=n/24; s=escala(t)
    arr=np.asarray(f.to_image(),dtype=np.float32)
    arr=texto(arr,t,n)
    if s<0.9999:
        w,h=round(W*s),round(H*s)
        r=cv2.resize(arr,(w,h),interpolation=cv2.INTER_AREA)
        ramp=40.0*(1-s)/0.2
        yy=np.minimum(np.arange(h),h-1-np.arange(h)).astype(np.float32)
        xx=np.minimum(np.arange(w),w-1-np.arange(w)).astype(np.float32)
        al=(np.clip(yy/ramp,0,1)[:,None]*np.clip(xx/ramp,0,1)[None,:])[...,None]
        r=r*al+BG*(1-al)
        arr=np.empty((H,W,3),dtype=np.float32); arr[:]=BG
        y0=(H-h)//2; x0=(W-w)//2; arr[y0:y0+h,x0:x0+w]=r
    fr=av.VideoFrame.from_ndarray(arr.clip(0,255).astype(np.uint8),format="rgb24")
    fr.pts=n; fr.time_base=Fraction(1,24); n+=1
    for p in ov.encode(fr): out.mux(p)
for p in ov.encode(): out.mux(p)
src2=av.open(SRC)
for p in src2.demux(src2.streams.audio[0]):
    if p.dts is None: continue
    p.stream=oa; out.mux(p)
out.close()
c=av.open(OUT); print(c.duration/1e6,[(s.type,s.codec_context.name) for s in c.streams])
