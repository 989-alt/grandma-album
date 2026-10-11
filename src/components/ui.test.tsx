// T04 계약 edge_cases 7개. jsdom 이 없어(새 의존성 금지) preact 가 쓰는 만큼만 흉내 낸 작은 DOM 을 깐다.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, type ComponentChild } from 'preact';
import { act } from 'preact/test-utils';
import { CHAPTERS } from '../content';
import { answerBack, initialState } from '../engine';
import type { Chapter, Scene, State } from '../types';
import { Choices } from './Choices';
import { Hud, Strip } from './Hud';
import { PhotoBack } from './PhotoBack';
import { Album } from '../screens/Album';
import albumSrc from '../screens/Album.tsx?raw';

class N {
  childNodes: N[] = [];
  parentNode: N | null = null;
  attrs: Record<string, string> = {};
  style: Record<string, unknown> = { setProperty(k: string, v: string) { (this as Record<string, unknown>)[k] = v; } };
  ls: Record<string, { t: string; f: (e: unknown) => unknown }> = {};
  data = '';
  constructor(public nodeType: number, public localName: string) {}
  get firstChild(): N | null { return this.childNodes[0] ?? null; }
  get nextSibling(): N | null { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
  insertBefore(n: N, ref: N | null) {
    n.parentNode?.removeChild(n);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n);
    n.parentNode = this;
    return n;
  }
  appendChild(n: N) { return this.insertBefore(n, null); }
  contains(n: N | null): boolean { return !!n && (n === this || this.childNodes.some((c) => c.contains(n))); }
  removeChild(n: N) { this.childNodes.splice(this.childNodes.indexOf(n), 1); n.parentNode = null; return n; }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); }
  removeAttribute(k: string) { delete this.attrs[k]; }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  addEventListener(t: string, f: (e: unknown) => unknown) { this.ls[t.toLowerCase()] = { t, f }; }
  removeEventListener(t: string) { delete this.ls[t.toLowerCase()]; }
  get textContent(): string { return this.nodeType === 3 ? this.data : this.childNodes.map((c) => c.textContent).join(''); }
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).document = {
    createElement: (t: string) => new N(1, t),
    createElementNS: (_: string, t: string) => new N(1, t),
    createTextNode: (s: string) => Object.assign(new N(3, '#text'), { data: String(s) }),
  };
});

let root: N;
const mount = (v: ComponentChild) => { root = new N(1, 'div'); act(() => render(v, root as unknown as Element)); };
afterEach(() => { act(() => render(null, root as unknown as Element)); vi.useRealTimers(); });

const all = (pred: (n: N) => boolean, n: N = root): N[] => [...(pred(n) ? [n] : []), ...n.childNodes.flatMap((c) => all(pred, c))];
const cls = (c: string) => (n: N) => (n.attrs.class ?? '').split(' ').includes(c);
const text = (t: string) => (n: N) => n.localName === 'button' && n.textContent === t;
/** 버블링 + 브라우저처럼 disabled 버튼은 click 이 안 간다(force 면 무시하고 쏜다 — 코드 쪽 방어 확인용). */
const fire = (target: N, type: string, force = false) => act(() => {
  if (type === 'click' && !force && 'disabled' in target.attrs) return;
  const e = { type: '', target, currentTarget: target, preventDefault() {}, stopPropagation() {} };
  for (let n: N | null = target; n; n = n.parentNode) {
    const l = n.ls[type];
    if (l) { e.type = l.t; e.currentTarget = n; l.f.call(n, e); }
  }
});
/** 스냅샷용 직렬화(img src 는 이름만). */
const html = (n: N): string => n.nodeType === 3 ? n.data
  : `<${n.localName}${Object.entries(n.attrs).filter(([k]) => k !== 'style').map(([k, v]) => ` ${k}="${k === 'src' ? v.slice(v.lastIndexOf('/') + 1) : v}"`).join('')}>${n.childNodes.map(html).join('')}</${n.localName}>`;

const ch = (i: number) => CHAPTERS[i - 1] as unknown as Chapter;
const scene = (id: string) => ch(Number(id[0])).scenes.find((s) => s.id === id)! as Scene;
const at = (id: string, patch: Partial<State> = {}): State => ({ ...initialState(0), chapter: Number(id[0]), sceneIdx: Number(id.slice(2)) - 1, ...patch });

describe('T04 edge_cases', () => {
  it('1. 선택 카드 연타 — 첫 탭만 반영, 이후 전부 disabled', () => {
    const onChoose = vi.fn();
    mount(<Choices chapter={ch(3)} scene={scene('3-3')} state={at('3-3')} onChoose={onChoose} />);
    const cards = all(cls('card'));
    expect(cards).toHaveLength(3);
    fire(cards[0], 'click');
    fire(cards[0], 'click'); // 더블 클릭 둘째 탭(disabled → 브라우저는 안 보냄)
    fire(cards[0], 'click', true); // 그래도 핸들러가 다시 받지 않는다
    fire(cards[1], 'click', true);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(0);
    expect(all(cls('card')).every((c) => 'disabled' in c.attrs)).toBe(true);
    expect(cls('chosen')(cards[0])).toBe(true);
  });

  it('2. 뒷면 초성 열쇠 탭 → 오답도 할머니 교정 쪽지 뒤 진행 콜백(초성·O·X 둘 다)', () => {
    const sc = scene('3-3');
    const judge = vi.fn((a: string[] | boolean) => answerBack(at('3-3'), sc, a).correct);
    const onNext = vi.fn();
    mount(<PhotoBack scene={sc} judge={judge} onNext={onNext} />);
    const keys = all(cls('key')).filter((k) => !cls('wide')(k));
    expect(keys.length).toBeGreaterThanOrEqual(4);
    expect(keys.length).toBe(sc.back.type === 'initial' ? sc.back.keys.length : 0);
    expect(all(text('다음 사진'))).toHaveLength(0); // 판정 전엔 진행 없음
    fire(all(text('서'))[0], 'click');
    fire(all(text('소'))[0], 'click');
    expect(judge).toHaveBeenCalledWith(['서', '소']);
    const note = all(cls('note'));
    expect(note).toHaveLength(1);
    expect(note[0].textContent).toBe('일제는 전국에 세운 신사에 강제로 절을 하게 했다.');
    expect(all((n) => n.localName === 'img' && n.attrs.alt === '할머니')).toHaveLength(1);
    fire(all(text('다음 사진'))[0], 'click');
    expect(onNext).toHaveBeenCalledTimes(1);

    act(() => render(null, root as unknown as Element));
    const ox = scene('1-1');
    const next2 = vi.fn();
    mount(<PhotoBack scene={ox} judge={(a) => answerBack(at('1-1'), ox, a).correct} onNext={next2} />);
    expect(all(cls('wide'))).toHaveLength(2); // O·X key-wide 둘
    fire(all(text('O'))[0], 'click'); // 정답은 X
    expect(all(cls('note'))[0].textContent).toBe(ox.back.type === 'ox' ? ox.back.fix : '');
    fire(all(text('다음 사진'))[0], 'click');
    expect(next2).toHaveBeenCalledTimes(1);
  });

  it('3. 색엔 모양·글자 병기: 정답 = 또렷 + ✓ 도장, 오답 = 흐림 + ✗ 도장', () => {
    const sc = scene('3-3');
    const back = () => html(all(cls('back'))[0]);
    mount(<PhotoBack scene={sc} judge={(a) => answerBack(at('3-3'), sc, a).correct} onNext={() => {}} />);
    fire(all(text('신'))[0], 'click');
    fire(all(text('사'))[0], 'click');
    expect(back()).toMatchInlineSnapshot(`"<div class="back abs"><div class="abs"><div class="line">일제는 전국에 세운 <span class="blank filled">신</span><span class="blank filled">사</span>에 강제로 절을 하게 했다.</div></div><img class="stamp" src="stamp-ok.webp" alt="정답 ✓"></img></div>"`);
    act(() => render(null, root as unknown as Element));
    mount(<PhotoBack scene={sc} judge={(a) => answerBack(at('3-3'), sc, a).correct} onNext={() => {}} />);
    fire(all(text('수'))[0], 'click');
    fire(all(text('시'))[0], 'click');
    expect(back()).toMatchInlineSnapshot(`"<div class="back abs"><div class="abs"><div class="line">일제는 전국에 세운 <span class="blank filled faint">수</span><span class="blank filled faint">시</span>에 강제로 절을 하게 했다.</div></div><img class="stamp" src="stamp-wrong.webp" alt="오답 ✗"></img></div>"`);
  });

  it('4. 게이지 숫자 노출 0 — 띠(초상·게이지) 렌더 텍스트·라벨에 숫자 없음', () => {
    const st = at('3-3', { stats: { family: 2, home: 3, third: 1 }, family: { brother: 'unknown', father: 'apart' } });
    mount(<Strip chapter={ch(3)} state={st} left={0} top={0} width={600} />);
    const strip = all(cls('strip'))[0];
    expect(strip.textContent).not.toMatch(/\d/);
    expect(all((n) => /\d/.test(n.attrs['aria-label'] ?? '') || /\d/.test(n.attrs.alt ?? ''))).toHaveLength(0);
    const rows = all(cls('gauge'));
    expect(rows.map((r) => r.childNodes.filter((c) => c.localName === 'i').length)).toEqual([5, 3, 3]);
    expect(rows.map((r) => r.childNodes.filter(cls('on')).length)).toEqual([3, 3, 1]); // 가족 = 'with' 수
    expect(all(cls('apart'))).toHaveLength(1);
    expect(all(cls('slot'))).toHaveLength(1); // 소식 모름 = 빈 액자
    act(() => render(null, root as unknown as Element));
    mount(<Hud chapter={ch(1)} state={at('1-1')} onAlbum={() => {}} />);
    expect(all(cls('gauges'))[0].textContent).not.toMatch(/\d/);
  });

  it('5. 잠긴 카드: 흐린 pressed 카드 + 자물쇠 + 힌트 1줄, 탭 불가', () => {
    const onChoose = vi.fn();
    mount(<Choices chapter={ch(3)} scene={scene('3-3')} state={at('3-3', { stats: { family: 2, home: 1, third: 1 } })} onChoose={onChoose} />);
    const locked = all(cls('locked')).filter(cls('card'));
    expect(locked).toHaveLength(1);
    const card = locked[0];
    expect('disabled' in card.attrs).toBe(true);
    expect(all((n) => n.attrs.alt === '잠김', card)).toHaveLength(1);
    expect(all(cls('tag'), card).map((t) => t.textContent)).toEqual(['살림 2칸 필요']);
    fire(card, 'click');
    fire(card, 'click', true);
    expect(onChoose).not.toHaveBeenCalled();
    expect(all(cls('card')).filter((c) => !('disabled' in c.attrs))).toHaveLength(2); // 나머지는 그대로 탭 가능
  });

  it('6. 3초 무입력 손 표시는 S2 반짝이는 빈 칸에만, 입력 즉시 제거', () => {
    vi.useFakeTimers();
    mount(<Album state={at('3-3')} onOpen={() => {}} />);
    const hand = () => all(cls('hint-hand'));
    act(() => { vi.advanceTimersByTime(2999); });
    expect(hand()).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(1); });
    expect(hand()).toHaveLength(1);
    const glow = all(cls('glow'))[0];
    expect(glow.localName).toBe('button'); // 빈 칸 = 반짝이는 칸 하나
    expect(all(cls('glow'))).toHaveLength(1);
    fire(all(cls('screen'))[0], 'pointerdown');
    expect(hand()).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(hand()).toHaveLength(1);
    fire(all(cls('screen'))[0], 'keydown');
    expect(hand()).toHaveLength(0);
    // 반짝이는 칸이 없는 펼침(뒤표지)엔 손이 안 뜬다
    fire(all(text('뒤쪽'))[0], 'click');
    fire(all(text('뒤쪽'))[0], 'click');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(all(cls('glow'))).toHaveLength(0);
    expect(hand()).toHaveLength(0);
  });

  it('7. Pointer Events·touch-action: 드래그 영역 없음 → touch-action:none 선언 0, 무대는 manipulation, 무입력 리셋은 pointerdown', () => {
    // vitest 는 .css 를 비워서 들이므로(?raw 포함) 파일을 직접 읽는다. @types/node 가 없어 getBuiltinModule 로.
    const fs = (globalThis as unknown as { process: { getBuiltinModule(m: string): { readFileSync(u: URL, e: string): string } } }).process.getBuiltinModule('node:fs');
    const kitCss = fs.readFileSync(new URL('../styles/kit.css', import.meta.url), 'utf8');
    expect(kitCss).not.toMatch(/touch-action:\s*none/);
    expect(kitCss).toMatch(/\.stage \{[^}]*touch-action: manipulation/);
    expect(albumSrc).toMatch(/onPointerDown=\{input\}/);
  });
});
