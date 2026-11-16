#!/usr/bin/env python3
"""효과음과 배경 음악을 합성해 assets/sounds/ 에 WAV 로 저장한다 (저작권 걱정 없는 직접 만든 소리).

사용: python3 tools/gen_audio.py            # 모두 만들기
      python3 tools/gen_audio.py --sfx      # 효과음만
      python3 tools/gen_audio.py --music    # 음악만

효과음: assets/sounds/sfx/<이름>.wav (스킬 데이터의 sound 값과 같은 이름)
음악:   assets/sounds/music/<menu|battle|boss>.wav (게임이 끝까지 반복 재생)
실제 소리 파일이 생기면 같은 이름으로 바꿔 넣으면 된다.
"""
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 22050
rng = np.random.default_rng(7)


# ---- 기본 재료 ----

def t_axis(dur):
    return np.arange(int(dur * RATE)) / RATE


def env(dur, attack=0.005, decay=8.0):
    t = t_axis(dur)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t * decay)


def noise(dur):
    return rng.uniform(-1, 1, int(dur * RATE))


def lowpass(x, cutoff):
    """한 극 저역 통과 (cutoff 는 Hz, 배열이면 시간에 따라 바뀜)"""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1.0 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def bandpass(x, lo, hi):
    return lowpass(highpass(x, lo), hi)


def sweep(f0, f1, dur, shape="sin"):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / RATE
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if shape == "square":
        return np.sign(np.sin(ph))
    if shape == "tri":
        return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1.0) - 1) - 1
    return np.sin(ph)


def tone(freq, dur, shape="sin"):
    return sweep(freq, freq, dur, shape)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def delay(x, at):
    return np.concatenate([np.zeros(int(at * RATE)), x])


_IR = {}


def reverb(x, amount=0.3, length=0.6):
    """짧은 잔향: 지수적으로 줄어드는 잡음 임펄스 응답과 FFT 합성곱"""
    key = (round(length, 3),)
    if key not in _IR:
        n = int(length * RATE)
        ir = np.random.default_rng(3).uniform(-1, 1, n) * np.exp(-np.arange(n) / RATE * (6.9 / length))
        _IR[key] = lowpass(ir, 3500)
    ir = _IR[key]
    size = len(x) + len(ir)
    nfft = 1 << (size - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:size]
    wet = wet / (np.max(np.abs(wet)) or 1.0) * (np.max(np.abs(x)) or 1.0)
    return np.pad(x, (0, size - len(x))) + wet * amount


def normalize(x, peak=0.85):
    m = np.max(np.abs(x)) or 1.0
    fade = min(len(x), int(0.004 * RATE))
    x = x / m * peak
    if fade:
        x[-fade:] *= np.linspace(1, 0, fade)
    return x


def save(path: Path, x, peak=0.85):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (normalize(x, peak) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())


# ---- 효과음 ----

def whoosh(dur=0.3, lo=300, hi=3000, rise=0.4):
    t = t_axis(dur)
    k = np.clip(t / (dur * rise), 0, 1)
    cut = lo + (hi - lo) * np.sin(np.pi * np.clip(t / dur, 0, 1))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return lowpass(noise(dur), cut) * e * (0.6 + 0.4 * k)


def ting(freq=2400, dur=0.35, decay=12):
    return (tone(freq, dur) + 0.5 * tone(freq * 2.76, dur) + 0.25 * tone(freq * 5.4, dur)) * env(dur, 0.001, decay)


def thump(freq=90, dur=0.25, decay=14):
    return sweep(freq * 2.2, freq * 0.6, dur) * env(dur, 0.002, decay)


def sfx():
    S = {}
    # 공통
    S["hit"] = mix(lowpass(noise(0.09), 2500) * env(0.09, 0.001, 45) * 0.7, thump(150, 0.09, 30) * 0.8)
    S["crit"] = mix(S["hit"] * 1.2, ting(1800, 0.25, 16) * 0.5, delay(lowpass(noise(0.12), 4000) * env(0.12, 0.001, 30) * 0.5, 0.02))
    S["hurt"] = mix(sweep(260, 120, 0.14) * env(0.14, 0.002, 18), lowpass(noise(0.1), 1200) * env(0.1, 0.001, 35) * 0.5)
    S["death"] = reverb(mix(sweep(440, 110, 0.6, "tri") * env(0.6, 0.005, 4), thump(70, 0.5, 6) * 0.7), 0.35)
    S["level_up"] = reverb(mix(*[delay(tone(f, 0.5, "tri") * env(0.5, 0.004, 6) * 0.5, i * 0.07) for i, f in enumerate([523, 659, 784, 1047, 1319])]), 0.4)
    S["buy"] = mix(ting(1568, 0.3, 14) * 0.6, delay(ting(2093, 0.35, 12) * 0.6, 0.06))
    S["boss"] = reverb(mix(tone(55, 1.4, "saw") * env(1.4, 0.15, 1.6) * 0.5, tone(82.5, 1.4, "saw") * env(1.4, 0.2, 1.8) * 0.35, lowpass(noise(1.4), 300) * env(1.4, 0.3, 2) * 0.6), 0.4)
    S["victory"] = reverb(mix(*[delay(tone(f, 0.9, "tri") * env(0.9, 0.005, 3) * 0.45, i * 0.12) for i, f in enumerate([523, 659, 784, 1047, 1319, 1568])]), 0.4)
    S["defeat"] = reverb(mix(*[delay(tone(f, 1.0, "tri") * env(1.0, 0.01, 2.5) * 0.45, i * 0.22) for i, f in enumerate([440, 392, 349, 262])]), 0.4)
    S["click"] = tone(900, 0.04) * env(0.04, 0.001, 90)
    S["respawn"] = reverb(mix(sweep(300, 900, 0.5, "tri") * env(0.5, 0.05, 4) * 0.5, ting(1760, 0.5, 6) * 0.3), 0.3)
    S["minion_up"] = reverb(mix(tone(98, 0.8, "saw") * env(0.8, 0.02, 3) * 0.5, delay(tone(147, 0.6, "saw") * env(0.6, 0.02, 4) * 0.4, 0.15), lowpass(noise(0.8), 500) * env(0.8, 0.05, 4) * 0.4), 0.3)
    # 스킬 종류
    S["slash"] = mix(whoosh(0.22, 800, 6000, 0.3), delay(ting(2600, 0.25, 18) * 0.35, 0.07))
    S["stab"] = mix(whoosh(0.12, 1500, 7000, 0.2) * 0.8, delay(ting(3200, 0.2, 25) * 0.5, 0.05))
    S["dash"] = whoosh(0.4, 200, 4500, 0.5)
    S["spin"] = mix(*[delay(whoosh(0.18, 600, 5000, 0.5) * (0.9 - i * 0.15), i * 0.11) for i in range(4)])
    S["fire"] = mix(lowpass(noise(0.7), np.linspace(3000, 600, int(0.7 * RATE))) * env(0.7, 0.03, 4),
                    (rng.uniform(0, 1, int(0.7 * RATE)) > 0.995) * rng.uniform(-1, 1, int(0.7 * RATE)) * 1.5 * env(0.7, 0.01, 3),
                    thump(70, 0.5, 6) * 0.5)
    S["explosion"] = reverb(mix(thump(55, 1.0, 4) * 1.2, lowpass(noise(1.0), np.linspace(4000, 200, int(1.0 * RATE))) * env(1.0, 0.002, 4)), 0.35)
    S["ice"] = reverb(mix(*[delay(tone(f, 0.6) * env(0.6, 0.002, 7) * 0.3, i * 0.03) for i, f in enumerate([1890, 2510, 3130, 3970, 4720])],
                          highpass(noise(0.15), 3000) * env(0.15, 0.001, 30) * 0.6), 0.4)
    S["freeze"] = reverb(mix(S["ice"], highpass(noise(0.6), 2000) * env(0.6, 0.2, 5) * 0.5, thump(80, 0.4, 8) * 0.6), 0.4)
    S["holy"] = reverb(mix(*[tone(f, 0.9, "tri") * env(0.9, 0.08, 3) * 0.3 for f in [523, 659, 784, 1047]], ting(2093, 0.9, 4) * 0.35), 0.5)
    S["heal"] = reverb(mix(*[delay(tone(f, 0.5) * env(0.5, 0.01, 5) * 0.4, i * 0.06) for i, f in enumerate([659, 784, 988, 1319])], highpass(noise(0.6), 5000) * env(0.6, 0.1, 5) * 0.15), 0.5)
    S["shield"] = reverb(mix(tone(220, 0.6, "tri") * env(0.6, 0.02, 4) * 0.5, ting(1320, 0.6, 6) * 0.4, sweep(400, 900, 0.3) * env(0.3, 0.01, 8) * 0.3), 0.3)
    S["arrow"] = mix(sweep(900, 420, 0.12, "tri") * env(0.12, 0.001, 25) * 0.7, delay(whoosh(0.25, 1500, 6000, 0.3) * 0.8, 0.03))
    S["arrow_rain"] = mix(*[delay(whoosh(0.2, 2000, 7000, 0.3) * rng.uniform(0.4, 0.8), rng.uniform(0, 0.6)) for _ in range(9)])
    S["poison"] = mix(*[delay(sweep(f, f * 1.6, 0.12) * env(0.12, 0.005, 20) * 0.5, i * 0.07) for i, f in enumerate([220, 300, 180, 260, 200])],
                      lowpass(noise(0.5), 600) * env(0.5, 0.05, 6) * 0.3)
    S["dark"] = reverb(mix(sweep(110, 70, 0.8, "saw") * env(0.8, 0.25, 3) * 0.4, sweep(116, 74, 0.8, "saw") * env(0.8, 0.25, 3) * 0.4,
                           lowpass(noise(0.8), 800) * env(0.8, 0.3, 3) * 0.4), 0.4)
    S["summon"] = reverb(mix(sweep(80, 320, 0.7, "saw") * env(0.7, 0.2, 3) * 0.4,
                             *[delay(bandpass(noise(0.05), 800, 3000) * env(0.05, 0.001, 60) * 0.6, 0.3 + i * 0.06) for i in range(6)]), 0.4)
    S["punch"] = mix(thump(110, 0.18, 22) * 1.1, lowpass(noise(0.08), 3000) * env(0.08, 0.001, 50) * 0.7)
    S["flurry"] = mix(*[delay(S["punch"] * (0.9 - i * 0.08), i * 0.09) for i in range(6)])
    S["slam"] = reverb(mix(thump(60, 0.6, 7) * 1.3, lowpass(noise(0.5), np.linspace(2500, 200, int(0.5 * RATE))) * env(0.5, 0.002, 7)), 0.3)
    S["roar"] = reverb(mix(lowpass(noise(1.0), 900) * env(1.0, 0.1, 2.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t_axis(1.0))),
                           sweep(140, 90, 1.0, "saw") * env(1.0, 0.1, 2.5) * 0.4), 0.3)
    S["stealth"] = whoosh(0.5, 2000, 300, 0.8) * 0.8
    S["teleport"] = reverb(mix(sweep(1800, 300, 0.25) * env(0.25, 0.002, 10) * 0.5, whoosh(0.25, 3000, 600, 0.2) * 0.6), 0.3)
    S["meteor"] = mix(whoosh(1.0, 200, 2500, 0.95) * 0.7, delay(S["explosion"], 0.95))
    out = ROOT / "assets/sounds/sfx"
    for name, x in S.items():
        save(out / f"{name}.wav", x, 0.8)
    return list(S)


# ---- 음악 ----

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


_NOTE_CACHE = {}


def synth_note(freq, dur, kind):
    key = (round(freq, 3), round(dur, 5), kind)
    if key not in _NOTE_CACHE:
        _NOTE_CACHE[key] = _synth_note(freq, dur, kind)
    return _NOTE_CACHE[key]


def _synth_note(freq, dur, kind):
    n = int(dur * RATE)
    if kind == "bass":
        x = sweep(freq, freq, dur, "saw")
        x = lowpass(x, 600) * env(dur, 0.005, 3.5)
    elif kind == "pad":
        x = (tone(freq, dur, "saw") + tone(freq * 1.004, dur, "saw")) * 0.5
        x = lowpass(x, 1400)
        a = np.minimum(1, t_axis(dur) / 0.15) * np.minimum(1, (dur - t_axis(dur)) / 0.2)
        x = x * a
    elif kind == "lead":
        x = tone(freq, dur, "square") * 0.6 + tone(freq, dur, "tri") * 0.4
        x = lowpass(x, 3200) * env(dur, 0.01, 2.5)
    elif kind == "pluck":
        x = (tone(freq, dur, "tri") + 0.3 * tone(freq * 2, dur)) * env(dur, 0.002, 7)
    else:
        x = tone(freq, dur)
    return x[:n]


_DRUM = {}


def drum(kind, dur=0.25):
    if kind not in _DRUM:
        _DRUM[kind] = _drum(kind, dur)
    return _DRUM[kind]


def _drum(kind, dur=0.25):
    if kind == "kick":
        return sweep(150, 45, 0.22) * env(0.22, 0.001, 14)
    if kind == "snare":
        return mix(bandpass(noise(0.18), 900, 6000) * env(0.18, 0.001, 18) * 0.8, tone(190, 0.1) * env(0.1, 0.001, 30) * 0.4)
    if kind == "hat":
        return highpass(noise(0.05), 6000) * env(0.05, 0.001, 70) * 0.5
    if kind == "tom":
        return sweep(220, 110, 0.25) * env(0.25, 0.001, 12)
    return np.zeros(int(dur * RATE))


def place(track, x, at, gain=1.0):
    i = int(at * RATE)
    j = min(len(track), i + len(x))
    if i < len(track):
        track[i:j] += x[:j - i] * gain


def song(bpm, bars, chords, melody, drums, root=57, lead_oct=12, pad_gain=0.22, bass_gain=0.5, lead_gain=0.28, drum_gain=0.6, seed=1):
    """chords: 마디마다 (근음 반음, 단조?) / melody: 16분음표 칸마다 음 (음계 번호, None=쉼) / drums: 16칸 패턴"""
    beat = 60.0 / bpm
    step = beat / 4
    total = int(bars * 4 * beat * RATE)
    pad = np.zeros(total)
    bass = np.zeros(total)
    lead = np.zeros(total)
    drm = np.zeros(total)
    for b in range(bars):
        c, minor = chords[b % len(chords)]
        t0 = b * 4 * beat
        third = 3 if minor else 4
        for iv in (0, third, 7):
            place(pad, synth_note(midi(root + c + iv), 4 * beat, "pad"), t0, 1 / 3)
        for q in range(8):
            n = root - 12 + c + (12 if q % 4 == 3 else 0)
            place(bass, synth_note(midi(n), step * 1.8, "bass"), t0 + q * 2 * step)
        pat = melody[b % len(melody)]
        for s, deg in enumerate(pat):
            if deg is None or deg == "-":
                continue
            scale = [0, 2, 3, 5, 7, 8, 10]
            n = root + lead_oct + scale[deg % 7] + 12 * (deg // 7)
            if deg == "-":
                continue
            length = 1
            while s + length < len(pat) and pat[s + length] == "-":
                length += 1
            place(lead, synth_note(midi(n), step * length * 0.95, "lead"), t0 + s * step)
        for s in range(16):
            for k in drums.get(s, []):
                place(drm, drum(k), t0 + s * step)
    out = pad * pad_gain + bass * bass_gain + lead * lead_gain + drm * drum_gain
    # 반복 이음새: 끝을 짧게 페이드하지 않고 그대로 둔다 (게임이 처음부터 다시 재생)
    return out


def loop_wrap(x, n):
    """반복 길이 n 뒤로 넘친 잔향을 앞부분에 겹쳐 이음새 없이 반복되게 한다."""
    out = x[:n].copy()
    tail = x[n:]
    out[:len(tail)] += tail[:n]
    return out


def melody_from(degrees, rest_every=None):
    """음계 번호 목록을 16칸 마디로. '-' 는 앞 음을 늘림."""
    return degrees


def music():
    out = ROOT / "assets/sounds/music"
    # 메뉴: 느리고 차분한 A 단조 (Am F C G)
    menu_chords = [(0, True), (8, False), (3, False), (10, False)]
    menu_mel = [
        [4, "-", "-", "-", 2, "-", 0, "-", 2, "-", "-", "-", None, None, None, None],
        [0, "-", "-", "-", 5, "-", 4, "-", 2, "-", "-", "-", None, None, None, None],
        [2, "-", "-", "-", 4, "-", 7, "-", 6, "-", "-", "-", 4, "-", None, None],
        [3, "-", "-", "-", 2, "-", 1, "-", 4, "-", "-", "-", "-", "-", None, None],
    ]
    menu = song(84, 8, menu_chords, menu_mel, {0: ["kick"], 8: ["kick"], 4: ["hat"], 12: ["hat"]}, lead_gain=0.22, drum_gain=0.35, pad_gain=0.3)
    save(out / "menu.wav", loop_wrap(reverb(menu, 0.25), len(menu)), 0.7)
    # 전투: 빠르고 힘찬 (Am F G Em)
    battle_chords = [(0, True), (8, False), (10, False), (7, True)]
    battle_mel = [
        [0, None, 2, None, 4, "-", 2, None, 0, None, 4, None, 7, "-", 6, None],
        [5, None, 4, None, 2, "-", 0, None, 2, None, 4, None, 5, "-", "-", None],
        [6, None, 5, None, 4, "-", 6, None, 7, None, 6, None, 4, "-", 2, None],
        [4, None, 2, None, 1, "-", 2, None, 4, "-", "-", "-", None, None, 6, None],
    ]
    bd = {0: ["kick", "hat"], 2: ["hat"], 4: ["snare", "hat"], 6: ["hat"], 8: ["kick", "hat"], 10: ["kick", "hat"], 12: ["snare", "hat"], 14: ["hat"]}
    battle = song(132, 16, battle_chords, battle_mel, bd)
    save(out / "battle.wav", battle, 0.75)
    # 보스: 낮고 긴장감 있는 (Am Bb Am G#dim 느낌)
    boss_chords = [(0, True), (1, False), (0, True), (11, True)]
    boss_mel = [
        [0, "-", None, 0, 1, "-", 0, None, 7, "-", 6, "-", 5, "-", 4, None],
        [1, "-", None, 1, 2, "-", 1, None, 8, "-", 7, "-", 6, "-", 5, None],
        [0, "-", None, 0, 4, "-", 3, None, 7, "-", "-", "-", 9, "-", 8, None],
        [6, "-", 5, "-", 4, "-", 3, "-", 2, "-", 1, "-", 0, "-", None, None],
    ]
    bossd = {0: ["kick"], 3: ["kick"], 4: ["snare"], 6: ["kick"], 8: ["kick", "tom"], 10: ["kick"], 12: ["snare"], 14: ["tom"], 15: ["tom"]}
    boss = song(146, 16, boss_chords, boss_mel, bossd, root=45, lead_oct=24, bass_gain=0.6, drum_gain=0.7)
    save(out / "boss.wav", boss, 0.75)
    return ["menu", "battle", "boss"]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or "--sfx" in args:
        print("효과음:", ", ".join(sfx()))
    if not args or "--music" in args:
        print("음악:", ", ".join(music()))
