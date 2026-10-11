"""T07 에셋 변환: 원본(assets/img·ui·bgm·fonts) → assets/build/ (빌드에 인라인되는 변환본).

원본은 건드리지 않는다. 재실행해도 같은 바이트가 나온다(결정적). 단계마다 필요한 라이브러리가 달라
venv 두 개로 나눠 돌린다(ffmpeg 없음):
  <PIL venv>/python  scripts/build-assets.py img        장면·비교·키아트·킷 → WebP
  <font venv>/python scripts/build-assets.py bgm fonts  BGM → 40kbps mono mp3, 폰트 → woff2 서브셋
  <font venv>/python scripts/build-assets.py sfx        효과음(assets/sfx/*.mp3, 없으면 0개) → 48kbps mono mp3
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
OUT = A / 'build'

SCENE_W, SCENE_Q = 720, 60     # 계약 순서 1 적용(800·70 → 10.09MB, 연결 후 측정)
TITLE_W, TITLE_Q = 1024, 72
KIT_Q = 80
BGM_KBPS = 40                  # 계약 순서 2 적용(48 → 9.27MB)
SFX_KBPS = 48
FONTS = ['GowunBatang-Regular', 'GowunBatang-Bold', 'GowunDodum-Regular', 'NanumPenScript-Regular']


def img():
    from PIL import Image
    (OUT / 'img').mkdir(parents=True, exist_ok=True)
    (OUT / 'kit').mkdir(parents=True, exist_ok=True)
    photos = sorted(A.glob('img/scene-*.png')) + sorted(A.glob('img/compare-*-before.png')) + sorted(A.glob('img/compare-*-after.png'))
    jobs = [(p, SCENE_W, SCENE_Q) for p in photos] + [(A / 'img/key-title.png', TITLE_W, TITLE_Q)]
    for p, w, q in jobs:
        im = Image.open(p).convert('RGB')
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(OUT / 'img' / f'{p.stem}.webp', 'WEBP', quality=q, method=6)
    # 킷: 9-slice 수치가 원본 픽셀 기준이라 크기는 그대로, 알파 유지 lossy
    kits = sorted(A.glob('ui/kit/*.png')) + sorted(A.glob('img/kit/*.png'))
    names = [p.stem for p in kits]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        sys.exit(f'킷 이름 충돌: {sorted(dup)}')
    for p in kits:
        Image.open(p).convert('RGBA').save(OUT / 'kit' / f'{p.stem}.webp', 'WEBP', quality=KIT_Q, method=6, alpha_quality=100, exact=False)
    print(f'img: 사진 {len(jobs)} · 킷 {len(kits)}')

    # photoAsset·compare 키가 변환본과 1:1 인지
    src = (ROOT / 'src/content/chapters.ts').read_text('utf8')
    keys = set(re.findall(r"photoAsset: '([^']+)'", src)) | set(re.findall(r"[ab]: '(compare-[^']+)'", src))
    have = {p.stem for p in (OUT / 'img').glob('*.webp')}
    miss = sorted(keys - have)
    print(f'photoAsset 키 {len(keys)} · 누락 {len(miss)}' + (f': {miss}' if miss else ''))


def mp3(src, out, kbps, cap=None, fade=0.12):
    import lameenc
    import miniaudio
    d = miniaudio.decode_file(str(src), output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=32000)
    pcm = d.samples
    if cap:  # 효과음: 최대 cap 초(mp3 패딩 ~70ms 포함 재생 1.5초 이내)로 자르고 끝 fade 초는 선형 페이드아웃(정수 연산 = 결정적)
        pcm = pcm[:round(cap * 32000)]
        n = min(len(pcm), round(fade * 32000))
        for i in range(n):
            pcm[len(pcm) - n + i] = pcm[len(pcm) - n + i] * (n - 1 - i) // (n - 1)
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(32000)
    enc.set_channels(1)
    enc.set_quality(2)
    out.write_bytes(enc.encode(pcm.tobytes()) + enc.flush())


def bgm():
    (OUT / 'bgm').mkdir(parents=True, exist_ok=True)
    for p in sorted(A.glob('bgm/bgm-*.mp3')):
        mp3(p, OUT / 'bgm' / f'{p.stem[4:]}.mp3', BGM_KBPS)
    print(f'bgm: {len(list((OUT / "bgm").glob("*.mp3")))}')


def sfx():
    (OUT / 'sfx').mkdir(parents=True, exist_ok=True)
    for p in sorted(A.glob('sfx/*.mp3')):
        mp3(p, OUT / 'sfx' / f'{p.stem}.mp3', SFX_KBPS, cap=1.43)
    print(f'sfx: {len(list((OUT / "sfx").glob("*.mp3")))}')


def charset():
    files = [ROOT / 'index.html'] + sorted((ROOT / 'src').rglob('*.ts')) + sorted((ROOT / 'src').rglob('*.tsx'))
    text = ''.join(f.read_text('utf8') for f in files if '.test.' not in f.name)
    chars = {c for c in text if ord(c) > 0x7e}
    chars |= {chr(c) for c in range(0x20, 0x7f)}        # 영문·숫자·기본 구두점
    chars |= {chr(c) for c in range(0x3131, 0x314f)}    # ㄱ-ㅎ
    chars |= {chr(c) for c in range(0x314f, 0x3164)}    # ㅏ-ㅣ
    chars -= {'\n', '\r', '\t'}
    return ''.join(sorted(chars))


def fonts():
    from fontTools.ttLib import TTFont
    (OUT / 'fonts').mkdir(parents=True, exist_ok=True)
    txt = OUT / 'fonts' / 'charset.txt'
    txt.write_text(charset(), 'utf8')
    sub = Path(sys.executable).parent / 'pyftsubset'
    for n in FONTS:
        out = OUT / 'fonts' / f'{n}.woff2'
        subprocess.run([str(sub), str(A / 'fonts' / f'{n}.ttf'), f'--text-file={txt}', '--flavor=woff2',
                        '--layout-features=*', '--no-hinting', '--desubroutinize', f'--output-file={out}'], check=True)
        f = TTFont(out)
        cmap = f.getBestCmap()
        lost = [c for c in txt.read_text('utf8') if ord(c) not in cmap and not c.isspace()]
        print(f'font {n}: 글리프 {len(f.getGlyphOrder())} · cmap {len(cmap)} · 원본에 없는 글자 {len(lost)} {"".join(lost[:40])}')


if __name__ == '__main__':
    steps = {'img': img, 'bgm': bgm, 'sfx': sfx, 'fonts': fonts}
    for s in sys.argv[1:] or sys.exit(__doc__):
        steps[s]()
