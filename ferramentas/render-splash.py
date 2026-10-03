"""Re-renderiza a splash do Forex Assist (AJUSTE-070/071/072).

Entrada : splash-original.mp4 (video enviado pelo usuario, 360x640, 24 fps; nao versionado)
Saida   : assets/splash.mp4
Dependencias: av (PyAV), numpy, opencv-python-headless, pillow.

O que faz:
 1. Escala do quadro: 100% ate 1,9 s -> 80% (2,5 s) -> 75% (4,0-4,8 s).
 2. Escrito (bloco abaixo do logo): separado do fundo (inpaint) e reduzido para que as
    LATERAIS de "FOREX ASSIST" coincidam com as do logo (KT).
 3. "Raio" que grava o escrito (5,55-6,42 s no original): camera lenta F vezes, com
    mistura de quadros; o audio desse trecho e esticado junto (atempo) para manter o sincronismo.
 4. Segura o ultimo quadro por HOLD_S segundos.
Audio fora do trecho do raio e recodificado em AAC sem mudanca de conteudo.
"""
import av, numpy as np, cv2
from fractions import Fraction

SRC = "splash-original.mp4"
OUT = "assets/splash.mp4"
W, H, FPS = 360, 640, 24
BG = np.array([10, 25, 35], dtype=np.float32)

KT = 0.87                  # escala do escrito (laterais = laterais do logo)
ANC = 22                   # ancora (px abaixo do topo da faixa) para reduzir o escrito
RAIO_A, RAIO_B = 5.55, 6.42  # trecho do raio, em segundos do ORIGINAL
F = 2.0                    # quantas vezes mais devagar o raio passa
HOLD_S = 1.0               # tempo extra com o logo pronto no fim


def sstep(a, b, t):
    x = min(1, max(0, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)


def escala(t):
    return 1.0 + (0.80 - 1.0) * sstep(1.9, 2.5, t) + (0.75 - 0.80) * sstep(4.0, 4.8, t)


def ymax_ouro(a):
    g = (a[..., 0] > 150) & (a[..., 1] > 110) & (a[..., 2] < 110)
    ys = np.where(g.sum(axis=1) > 1)[0]
    return int(ys.max()) if len(ys) else 0


def texto(arr, t, ym):
    a = sstep(5.2, 5.4, t)
    if a <= 0:
        return arr
    by0 = int(ym) + 5
    by1 = min(H - 1, by0 + 110)
    band = arr[by0:by1].astype(np.uint8)
    mask = (band.max(axis=2) > 60).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    bg = cv2.inpaint(band, mask, 3, cv2.INPAINT_TELEA).astype(np.float32)
    layer = np.clip(band.astype(np.float32) - bg, 0, 255)
    h = by1 - by0
    w2, h2 = round(W * KT), round(h * KT)
    ls = cv2.resize(layer, (w2, h2), interpolation=cv2.INTER_AREA)
    nl = np.zeros_like(layer)
    x0 = (W - w2) // 2
    y0 = round(ANC * (1 - KT))
    hh = min(h2, h - y0)
    nl[y0:y0 + hh, x0:x0 + w2] = ls[:hh]
    proc = np.clip(bg + nl, 0, 255)
    out = arr.copy()
    out[by0:by1] = band.astype(np.float32) * (1 - a) + proc * a
    return out


def reduzir(arr, s):
    if s >= 0.9999:
        return arr
    w, h = round(W * s), round(H * s)
    r = cv2.resize(arr, (w, h), interpolation=cv2.INTER_AREA)
    ramp = 40.0 * (1 - s) / 0.2
    yy = np.minimum(np.arange(h), h - 1 - np.arange(h)).astype(np.float32)
    xx = np.minimum(np.arange(w), w - 1 - np.arange(w)).astype(np.float32)
    al = (np.clip(yy / ramp, 0, 1)[:, None] * np.clip(xx / ramp, 0, 1)[None, :])[..., None]
    r = r * al + BG * (1 - al)
    out = np.empty((H, W, 3), dtype=np.float32)
    out[:] = BG
    y0, x0 = (H - h) // 2, (W - w) // 2
    out[y0:y0 + h, x0:x0 + w] = r
    return out


def t_fonte(t):
    """tempo de saida -> tempo do original (raio em camera lenta)."""
    dur = (RAIO_B - RAIO_A) * F
    if t <= RAIO_A:
        return t
    if t <= RAIO_A + dur:
        return RAIO_A + (t - RAIO_A) / F
    return t - (F - 1) * (RAIO_B - RAIO_A)


# ---------- 1) quadros processados do original ----------
frames = [f.to_ndarray(format="rgb24") for f in av.open(SRC).decode(video=0)]
ym = np.array([ymax_ouro(a) for a in frames], dtype=float)
k = 5
pad = np.pad(ym, (k, k), mode="edge")
yms = np.array([np.median(pad[i:i + 2 * k + 1]) for i in range(len(ym))])
P = []
for i, a in enumerate(frames):
    t = i / FPS
    x = texto(a.astype(np.float32), t, yms[i])
    P.append(reduzir(x, escala(t)).clip(0, 255).astype(np.uint8))
N = len(P)

# ---------- 2) audio com o trecho do raio esticado ----------
src = av.open(SRC)
ast = src.streams.audio[0]
sr = ast.rate
lay = ast.layout.name
aud = np.concatenate([f.to_ndarray() for f in src.decode(audio=0)], axis=1).astype(np.float32)  # (canais, n)


def atempo(seg, tempo):
    g = av.filter.Graph()
    ab = g.add_abuffer(sample_rate=sr, format="fltp", layout=lay, time_base=Fraction(1, sr))
    at = g.add("atempo", str(tempo))
    sk = g.add("abuffersink")
    ab.link_to(at)
    at.link_to(sk)
    g.configure()
    outs = []
    pos = 0
    while pos < seg.shape[1]:
        chunk = np.ascontiguousarray(seg[:, pos:pos + 1024])
        fr = av.AudioFrame.from_ndarray(chunk, format="fltp", layout=lay)
        fr.sample_rate = sr
        fr.pts = pos
        fr.time_base = Fraction(1, sr)
        ab.push(fr)
        pos += 1024
        while True:
            try:
                outs.append(sk.pull().to_ndarray().reshape(-1, 2).T)
            except (av.error.BlockingIOError, av.error.EOFError):
                break
    ab.push(None)
    while True:
        try:
            outs.append(sk.pull().to_ndarray().reshape(-1, 2).T)
        except (av.error.BlockingIOError, av.error.EOFError):
            break
    return np.concatenate(outs, axis=1)


ia, ib = int(RAIO_A * sr), int(RAIO_B * sr)
meio = atempo(aud[:, ia:ib], 1.0 / F)
aud2 = np.concatenate([aud[:, :ia], meio, aud[:, ib:]], axis=1)

# ---------- 3) saida ----------
dur_video = N / FPS + (F - 1) * (RAIO_B - RAIO_A)
n_out = round(dur_video * FPS) + round(HOLD_S * FPS)
out = av.open(OUT, "w", options={"movflags": "+faststart"})
ov = out.add_stream("libx264", rate=FPS)
ov.width, ov.height, ov.pix_fmt = W, H, "yuv420p"
ov.options = {"crf": "17", "preset": "slow", "profile": "high"}
oa = out.add_stream("aac", rate=sr)
oa.layout = lay
for n in range(n_out):
    s = min(t_fonte(n / FPS) * FPS, N - 1)
    i0 = int(np.floor(s))
    i1 = min(i0 + 1, N - 1)
    w = s - i0
    img = P[i0] if w < 1e-3 else (P[i0].astype(np.float32) * (1 - w) + P[i1].astype(np.float32) * w).astype(np.uint8)
    fr = av.VideoFrame.from_ndarray(img, format="rgb24")
    fr.pts = n
    fr.time_base = Fraction(1, FPS)
    for p in ov.encode(fr):
        out.mux(p)
for p in ov.encode():
    out.mux(p)
pos = 0
while pos < aud2.shape[1]:
    chunk = np.ascontiguousarray(aud2[:, pos:pos + 1024])
    af = av.AudioFrame.from_ndarray(chunk, format="fltp", layout=lay)
    af.sample_rate = sr
    af.pts = pos
    af.time_base = Fraction(1, sr)
    for p in oa.encode(af):
        out.mux(p)
    pos += 1024
for p in oa.encode():
    out.mux(p)
out.close()
c = av.open(OUT)
print("duracao", c.duration / 1e6, [(s.type, s.codec_context.name) for s in c.streams])
