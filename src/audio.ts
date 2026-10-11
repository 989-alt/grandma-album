// BGM: 장마다 곡 하나(1 market · 2~3 lamp · 4 dawn · 5~6 winter). HTMLAudio 1개, 루프, 볼륨 0.5.
// 첫 사용자 제스처(pointerdown/keydown) 전에는 play() 를 부르지 않는다. 자동재생 차단 등 play 실패는 무시.
import { BGM, type BgmId } from './assets';

export const pickBgm = (chapter: number): BgmId =>
  chapter <= 1 ? 'market' : chapter <= 3 ? 'lamp' : chapter === 4 ? 'dawn' : 'winter';

const VOL = 0.5;
const HALF = 300; // 곡 교체 = 300ms 줄이고 300ms 올림(0.6초)

export class Bgm {
  /** 지금 틀어야 할 곡(null = 끔). e2e 가 읽는다. */
  id: BgmId | null = null;
  private el = new Audio();
  private armed = false;
  private timer = 0;

  constructor() {
    this.el.loop = true;
    this.el.volume = VOL;
    const arm = () => {
      removeEventListener('pointerdown', arm, true);
      removeEventListener('keydown', arm, true);
      this.armed = true;
      this.swap();
    };
    addEventListener('pointerdown', arm, true);
    addEventListener('keydown', arm, true);
  }

  set(id: BgmId | null) {
    if (id === this.id) return; // 같은 곡이면 끊지 않음
    this.id = id;
    if (!this.armed) return;
    if (this.el.paused) { this.swap(); return; }
    this.fade(0, () => this.swap());
  }

  private swap() {
    clearInterval(this.timer);
    if (!this.id) { this.el.pause(); return; }
    const src = BGM[this.id];
    if (this.el.getAttribute('src') !== src) this.el.src = src; // 페이드아웃 뒤면 볼륨 0 에서 다시 올림
    this.el.play().then(() => this.fade(VOL), () => {});
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
