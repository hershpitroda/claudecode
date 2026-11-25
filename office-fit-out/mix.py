"""Fitted: score, foley, voice and mix -> out/mix.wav (+ out/stems/).
96 BPM in F (Fmaj9 - Dm9 - Bbmaj7 - C6sus per bar): tuned mallets, a round bass and a dry kick outside the object,
bowed vibraphone and glass while the camera is close, a held F chord under the title. Foley is synthesised and placed
from events.json (window.EV); the voice is Kokoro (voice/out). Run: LIB=<library> python mix.py
"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or '/root/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, add, noise, lp, hp, bp, env_exp, t_, norm, compress, limit
from scipy.ndimage import uniform_filter1d, maximum_filter1d

S.seed(7)
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EVJ['dur']; EV = EVJ['ev']
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
T, VO, BPM = TL['T'], TL['VO'], TL['BPM']
BEAT = 60 / BPM; BAR = 4 * BEAT
N = int((DUR + 1.5) * SR)
def buf(): return np.zeros((N, 2), np.float32)
def b(bar, beat=0): return bar * BAR + beat * BEAT
rng = np.random.default_rng(3)

# ---------------- score ----------------
CH = [['F3', 'A3', 'C4', 'E4', 'G4'], ['D3', 'F3', 'A3', 'C4', 'E4'], ['A#2', 'D3', 'F3', 'A3', 'C4'], ['C3', 'F3', 'G3', 'A3', 'D4']]
ROOT = ['F1', 'D2', 'A#1', 'C2']
def up(p, n): return S.name(S.midi(p) + 12 * n)
ev, kick_t = [], []
PAT = [0, 2, 4, 2, 1, 3, 4, 3]
SIL1, IN, SIL2, PEO = T['sil1'], T['stackIn'], T['sil2'], T['people']
for bar in range(18):
    t0 = b(bar); c = CH[bar % 4]; r = ROOT[bar % 4]
    if bar <= 1:                                          # A: the empty shell, two soft bowed notes
        ev.append((t0 + .3, 'vibraphone_bowed', up(c[2], 1), BAR * .9, .34, -.25 + .5 * bar, .9))
        if bar == 1: ev.append((t0 + 2 * BEAT, 'glass', up(c[4], 1), 1.4, .3, .3, .45))
    if 2 <= bar <= 4:                                     # B: the stack arrives, the groove enters
        for i in range(8):
            ev.append((t0 + i * BEAT / 2, 'marimba', up(c[PAT[i]], 1 + (i == 2)), .35, .44 + .18 * (i % 2 == 0), [-.35, .35][i % 2], 1.0))
        for k in (0, 1.5, 2, 3.5): ev.append((t0 + k * BEAT, 'electric_bass', r, BEAT * .9, .7, 0, 1.1))
        for k in (0, 2): kick_t.append((t0 + k * BEAT, .95))
        for k in (1, 3): ev.append((t0 + k * BEAT, 'claves', None, None, .45, .2, .45))
    if 5 <= bar <= 7:                                     # C: the desk, sustained and airy
        for j, p in enumerate(c[1:4]): ev.append((t0 + j * .05, 'vibraphone_bowed', up(p, 1), BAR * 1.02, .4, -.4 + .4 * j, .75))
        for i in range(8): ev.append((t0 + i * BEAT / 2, 'marimba', up(c[PAT[i]], 1), .3, .3 + .1 * (i % 2 == 0), [-.3, .3][i % 2], .65))
        ev.append((t0, 'electric_bass', r, BAR * .5, .6, 0, .9)); kick_t.append((t0, .55))
    if 8 <= bar <= 10:                                    # D: the chair, sparse glass and a light pedal hat
        for k, idx in [(0, 4), (1.5, 2), (2.5, 3)]: ev.append((t0 + k * BEAT, 'glass', up(c[idx], 1 + (idx < 3)), 1.2, .36, .3 - .2 * k, .5))
        for k in range(8): ev.append((t0 + k * BEAT / 2, 'hihat', 'pedal', None, .2, .35, .2))
        ev.append((t0, 'vibraphone_bowed', up(c[0], 1), BAR, .32, 0, .6))
    if 11 <= bar <= 12:                                   # E: accessories and lights, fuller
        for i in range(16):
            t = t0 + i * BEAT / 4
            if t >= SIL2 - .03: break
            ev.append((t, 'marimba', up(c[PAT[i % 8]], 1 + (i % 8 == 2)), .3, .4 + .2 * (i % 4 == 0), [-.35, .35][i % 2], .9))
            ev.append((t, 'hihat', 'closed', None, .24 + .12 * (i % 2 == 0), -.3, .32))
        for k in (0, 1.5, 2, 3.5): ev.append((t0 + k * BEAT, 'electric_bass', r, BEAT * .9, .7, 0, 1.1))
        for k in (0, 2): kick_t.append((t0 + k * BEAT, .9))
    if 13 <= bar <= 15:                                   # F: people and the ceiling, four on the floor (from 33.75)
        for i in range(16):
            t = t0 + i * BEAT / 4
            if t < PEO - .01: continue
            ev.append((t, 'marimba', up(c[PAT[i % 8]], 1 + (i % 8 == 2)), .3, .46 + .2 * (i % 4 == 0), [-.35, .35][i % 2], 1.0))
            ev.append((t, 'hihat', 'closed', None, .28 + .15 * (i % 2 == 0), -.3, .36))
        for k in (0, 1.5, 2, 3, 3.5):
            if t0 + k * BEAT >= PEO - .01: ev.append((t0 + k * BEAT, 'electric_bass', r, BEAT * .9, .74, 0, 1.15))
        for k in (0, 1, 2, 3):
            if t0 + k * BEAT >= PEO - .01: kick_t.append((t0 + k * BEAT, .9))
        for k in (1, 3):
            if t0 + k * BEAT >= PEO - .01: ev.append((t0 + k * BEAT, 'claves', None, None, .5, .2, .5))
# G: the closed office and the title, a held F chord that rings out
tg = T['dims']
for j, p in enumerate(['F2', 'C3', 'F3', 'A3', 'C4', 'E4', 'G4']): ev.append((tg + j * .05, 'marimba', p, 2.5, .55, -.5 + .16 * j, .9))
for p in ['F3', 'A3', 'C4', 'E4']: ev.append((tg, 'vibraphone_bowed', p, 4.8, .42, 0, .8))
ev.append((tg, 'electric_bass', 'F1', 2.6, .7, 0, .9)); kick_t.append((tg, 1.0))
for k, p in [(0, 'C6'), (1, 'A5'), (2, 'F5')]: ev.append((T['title'] + k * BEAT * 2, 'glockenspiel', p, 2, .38, .25, .42))
# stops and lights: glockenspiel
ev.append((T['desk'] + BEAT, 'glockenspiel', 'C6', 2, .45, .15, .5))
ev.append((T['chair'] + BEAT, 'glockenspiel', 'E6', 2, .45, -.15, .5))
for i, p in enumerate(['F6', 'A6', 'C7', 'E7', 'G7']): ev.append((T['lights'] + i * .07, 'glockenspiel', p, 1.5, .3, -.4 + .2 * i, .38))

music = np.asarray(S.render([e for e in ev if e[0] < DUR], dur=N / SR, master=False), np.float32)
if len(music) < N: music = np.pad(music, ((0, N - len(music)), (0, 0)))
music = music[:N]
def kick(v=1.0):
    d = .45; tt = t_(d); f = 52 + 88 * np.exp(-tt / .035); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_exp(d, .15) + np.sin(2 * ph) * .28 * env_exp(d, .05) + hp(noise(d), 3000) * env_exp(d, .003) * .25
    return norm(x) * v
pulse = buf()
for t, v in kick_t: add(pulse, kick(v), t, .5)

# ---------------- foley: the materials of an office ----------------
fol = buf()
def wood(v=1.0, f=180, d=.35):            # desks landing: a dry wooden thud with a knock on top
    tt = t_(d)
    x = np.sin(2 * np.pi * f * tt * (1 - .15 * tt)) * env_exp(d, .06) + bp(noise(d), 300, 1800) * env_exp(d, .015) * .7
    x += np.sin(2 * np.pi * 620 * tt) * env_exp(d, .012) * .35
    return norm(x) * v
def plastic(p=1.0, v=1.0, d=.08):          # screens, chair shells: hollow plastic clack
    tt = t_(d); pp = p * (.92 + rng.random() * .16)
    x = hp(noise(d), 1500) * env_exp(d, .0025) * .6
    x += sum(a * np.sin(2 * np.pi * f * pp * tt + rng.random() * 6) * env_exp(d, tau) for f, a, tau in [(900, .7, .016), (2100, .45, .009), (520, .5, .022)])
    return norm(x) * v
def caster(v=1.0):                          # chairs: casters and a gas-lift hiss
    d = .5; tt = t_(d)
    roll = bp(noise(d), 200, 900) * np.sin(np.pi * np.clip(tt / .25, 0, 1)) * np.exp(-tt / .2)
    hiss = bp(noise(d), 3000, 9000) * np.exp(-((tt - .08) / .07) ** 2) * .5
    return norm(roll + hiss) * v
def ceramic(v=1.0):
    d = .5; tt = t_(d)
    return norm(sum(a * np.sin(2 * np.pi * f * tt) * env_exp(d, tau) for f, a, tau in [(1850, 1, .12), (4300, .5, .06), (6900, .2, .03)]) + hp(noise(d), 4000) * env_exp(d, .002) * .5) * v
def tile(v=1.0):                            # carpet tile: a soft felted tap
    d = .08; tt = t_(d)
    return norm(lp(noise(d), 1400) * env_exp(d, .01) + np.sin(2 * np.pi * 240 * tt) * env_exp(d, .015) * .5) * v
def thud(v=1.0, f=64, d=.5):
    tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .2 * tt)) * env_exp(d, .1) + lp(noise(d), 380) * env_exp(d, .03) * .6) * v
def swoosh(d=.6, v=1.0, rise=True):
    n = noise(d); out = np.zeros_like(n); tt = t_(d)
    for i in range(0, len(n), 480):
        hi = min(len(n), i + 480); u = i / len(n); u = u if rise else 1 - u
        f = 300 + 3600 * u ** 1.5; seg_ = bp(n[max(0, i - 2400):hi], f * .6, f * 1.4)[-(hi - i):]; out[i:hi] = seg_
    return norm(out * np.sin(np.pi * tt / d) ** 1.5) * v
def tick(v=1.0, f=5200):
    d = .03; tt = t_(d); return norm(np.sin(2 * np.pi * f * tt) * env_exp(d, .003) + hp(noise(d), 6000) * env_exp(d, .001) * .4) * v
def pen(v=1.0, d=.5):
    tt = t_(d); return norm(bp(noise(d), 3000, 9000) * np.sin(np.pi * tt / d) ** 2 * (1 + .3 * np.sin(2 * np.pi * 31 * tt))) * v
def motor(d=2.5):                           # sit-stand column motor
    tt = t_(d); f = 118 + 6 * np.sin(2 * np.pi * .7 * tt)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + np.sin(4 * np.pi * np.cumsum(f) / SR) * .3 + bp(noise(d), 400, 1600) * .25
    e = np.clip(tt / .15, 0, 1) * np.clip((d - tt) / .2, 0, 1)
    return norm(x * e)
def click(v=1.0):
    d = .05; tt = t_(d); return norm(hp(noise(d), 3000) * env_exp(d, .002) + np.sin(2 * np.pi * 2900 * tt) * env_exp(d, .005) * .5) * v
def creak(v=1.0):                           # people sitting: chair settle
    d = .35; tt = t_(d); f = 380 + 120 * tt / d
    x = bp(noise(d), 600, 2400) * (1 + np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * tt / d) ** 2
    return norm(x) * v
def suck(d=.6):
    tt = t_(d); return norm(lp(noise(d), 2500) * (tt / d) ** 3) * .5

for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'suck': add(fol, suck(.6), t, .16)
    elif ty == 'stackIn': add(fol, thud(1.2, 56, .7), t, .5); add(fol, swoosh(1.4, 1, False), t - .1, .26)
    elif ty == 'launch': add(fol, swoosh(.6, 1, False), t, .08, 0)
    elif ty == 'tile':
        for k in range(3): add(fol, tile(.8 + .2 * rng.random()), t + k * .035, .16, e['pan'] * .8)
    elif ty == 'drop': add(fol, swoosh(.9, 1, False), t, .14)
    elif ty == 'land':
        L = e['layer']
        if L == 'desk':
            for k in range(4): add(fol, wood(1, 170 + 15 * k), t + k * .03, .32, -.6 + .4 * k)
        elif L == 'chair':
            for k in range(4): add(fol, caster(1), t + k * .04, .22, -.6 + .4 * k); add(fol, plastic(.8, 1), t + k * .04, .14, -.6 + .4 * k)
        elif L == 'people':
            add(fol, thud(1, 70, .4), t, .3)
            for k in range(7): add(fol, creak(.8), t + .05 + k * .06, .12, -.7 + .23 * k)
        elif L == 'ceil': add(fol, thud(1.2, 52, .8), t, .5); add(fol, ceramic(.6), t + .02, .05, .3)
    elif ty == 'accLand':
        if e['kind'] == 'screen': add(fol, plastic(1.15, 1), t, .2, e['pan'] * .8)
        else: add(fol, wood(.8, 230, .25), t, .16, e['pan'] * .8); add(fol, ceramic(.5), t + .01, .04, e['pan'] * .8)
    elif ty == 'rise': add(fol, motor(T['riseEnd'] - T['rise']), t, .14, -.15)
    elif ty == 'lights':
        for k in range(4): add(fol, click(1), t + k * .07, .16, -.5 + .33 * k)
    elif ty == 'pull': add(fol, swoosh(1.5, 1, False), t, .28)
    elif ty == 'title': add(fol, thud(.8, 60, .6), t, .2)
    elif ty == 'label': add(fol, tick(1, 4800 + 300 * (len(e.get('id', '')) % 5)), t, .07, .5)
    elif ty == 'dim': add(fol, pen(1, .55), t, .09, .3); add(fol, tick(1, 6000), t + .55, .06, .3)

# room tone: an empty-room bed, joined by a faint office murmur once people are in
tt = np.arange(N) / SR
bed = lp(np.cumsum(noise(N / SR)) * .002, 300); bed -= np.convolve(bed, np.ones(4800) / 4800, 'same'); bed = norm(bed) * .5
hum = np.sin(2 * np.pi * 60 * tt) * .12 + np.sin(2 * np.pi * 120 * tt) * .05
mur = bp(noise(N / SR), 250, 1400); mur *= 1 + .6 * uniform_filter1d(np.abs(noise(N / SR)), int(.3 * SR)) * 6
mur = norm(mur) * np.clip((tt - PEO) / 2.0, 0, 1)
bedmix = (bed * .035 + hum * .003 + mur * .012)[:, None] * np.ones((1, 2))

# ---------------- near-silences ----------------
def gate(a, z, fade=.12):
    g = np.ones(N, np.float32); i0, i1, f = int(a * SR), int(z * SR), int(fade * SR)
    g[i0:i1] = 0; g[max(0, i0 - f):i0] *= np.linspace(1, 0, min(f, i0)); g[i1:i1 + f] *= np.linspace(0, 1, f)
    return g[:, None]
sil = gate(SIL1 + .05, IN - .01) * gate(SIL2 + .05, PEO - .01)
music *= sil; pulse *= sil

# ---------------- voice ----------------
voice = buf()
for v in VO:
    x, sr = sf.read(os.path.join(HERE, 'voice/out', v['id'] + '.wav'), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = soxr.resample(x, sr, SR)
    x = hp(x, 80); x = compress(x / (np.abs(x).max() + 1e-9) * .9, thr=.22, ratio=3.0)
    add(voice, x, v['t'], .5, 0)
venv = uniform_filter1d(maximum_filter1d(np.abs(voice).mean(1), int(.25 * SR)), int(.2 * SR))
duck = 1 - .55 * np.clip(venv / (venv.max() + 1e-9) * 4, 0, 1)

def rms(x): return float(np.sqrt(np.mean(x ** 2)) + 1e-12)
mus = music * .9 + pulse
for c in range(2): mus[:, c] = hp(mus[:, c], 44, 4); fol[:, c] = hp(fol[:, c], 36, 2)
mus *= duck[:, None]
mix = voice * 1.0 + mus * .42 + fol * .9 + bedmix
for c in range(2): mix[:, c] = limit(mix[:, c], .92)
os.makedirs(os.path.join(HERE, 'out/stems'), exist_ok=True)
end = int(DUR * SR); tail = int(.8 * SR)
mix = mix[:end]; mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
sf.write(os.path.join(HERE, 'out/mix.wav'), mix, SR, subtype='PCM_24')
for nm, x in [('voice', voice), ('music', mus * .42), ('foley', fol * .9)]: sf.write(os.path.join(HERE, f'out/stems/{nm}.wav'), x[:end], SR, subtype='PCM_24')
v_on = venv[:end] > venv.max() * .05
print(f'mix {DUR:.2f}s  voice rms {20*np.log10(rms(voice[:end][v_on])):.1f} dBFS  music rms {20*np.log10(rms((mus*.42)[:end])):.1f}  foley rms {20*np.log10(rms((fol*.9)[:end])):.1f}  peak {np.abs(mix).max():.2f}')
lo = lp(mix.mean(1), 60); print(f'20-60 Hz vs full band: {20*np.log10(rms(lo)/rms(mix.mean(1))):.1f} dB')
