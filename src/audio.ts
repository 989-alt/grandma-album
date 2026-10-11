// BGM: 장마다 곡 하나(1 market · 2~3 lamp · 4 dawn · 5~6 winter). HTMLAudio 1개, 루프, 볼륨 0.5.
// 첫 사용자 제스처(pointerdown/keydown) 전에는 play() 를 부르지 않는다. 자동재생 차단 등 play 실패는 무시.
// 효과음(playSfx)도 같은 게이트(armed) 뒤에만. 파일이 없는 id 는 조용히 건너뛴다(자막만).
import { BGM, SFX, type BgmId } from './assets';

export const pickBgm = (chapter: number): BgmId =>
  chapter <= 1 ? 'market' : chapter <= 3 ? 'lamp' : chapter === 4 ? 'dawn' : 'winter';

const VOL = 0.5;
const HALF = 300; // 곡 교체 = 300ms 줄이고 300ms 올림(0.6초)
const SFX_VOL = 0.7;
let armed = false; // 첫 제스처를 받았는지(BGM·효과음 공용)

export function playSfx(id: string) {
  if (!armed || !SFX[id]) return;
  const a = new Audio(SFX[id]);
  a.volume = SFX_VOL;
  a.play().catch(() => {});
}

export class Bgm {
  /** 지금 틀어야 할 곡(null = 끔). e2e 가 읽는다. */
  id: BgmId | null = null;
  private el = new Audio();
  private timer = 0;

  constructor() {
    this.el.loop = true;
    this.el.volume = VOL;
    const arm = () => {
      removeEventListener('pointerdown', arm, true);
      removeEventListener('keydown', arm, true);
      armed = true;
      // 제스처 안에서 동기로 play() 를 불러 요소를 깨운다(iOS·Safari). 곡이 없으면(타이틀) 소리 0 으로 깨웠다 멈춘다.
      const el = this.el;
      const want = this.id;
      el.src = BGM[want ?? 'market'];
      el.volume = 0;
      el.play().then(() => { if (this.id !== want) return; if (!want) el.pause(); else this.fade(VOL); }, () => {});
    };
    addEventListener('pointerdown', arm, true);
    addEventListener('keydown', arm, true);
  }

  set(id: BgmId | null) {
    if (id === this.id) return; // 같은 곡이면 끊지 않음
    this.id = id;
    if (!armed) return;
    if (this.el.paused) { this.swap(); return; }
    this.fade(0, () => this.swap());
  }

  private swap() {
    clearInterval(this.timer);
    if (!this.id) { this.el.pause(); return; }
    const src = BGM[this.id];
    if (this.el.getAttribute('src') !== src) this.el.src = src; // 페이드아웃 뒤면 볼륨 0 에서 다시 올림
    const want = this.id;
    this.el.play().then(() => { if (this.id === want) this.fade(VOL); }, () => {}); // 그사이 곡이 바뀌었으면 그쪽 swap 에 맡긴다
  }

  private fade(to: number, then?: () => void) {
    clearInterval(this.timer);
    const from = this.el.volume;
    const t0 = performance.now();
    this.timer = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / HALF);
      this.el.volume = from + (to - from) * k;
      if (k === 1) { clearInterval(this.timer); then?.(); }
    }, 30);
  }
}
