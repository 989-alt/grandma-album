// T05 계약 edge_cases 5개. 저장소에 jsdom 이 없어(새 의존성 금지) preact 가 쓰는 만큼만 흉내 낸 작은 DOM 을 깐다.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { ALL_SCENES, CHAPTERS } from '../content';
import { initialState } from '../engine';
import type { Scene, State } from '../types';
import { Compare } from './Compare';
import { Bundle } from './Bundle';
import { Letter } from './Letter';

class Node0 {
  childNodes: Node0[] = [];
  parentNode: Node0 | null = null;
  attrs: Record<string, string> = {};
  style: Record<string, unknown> = { setProperty(k: string, v: string) { (this as Record<string, unknown>)[k] = v; } };
  ls: Record<string, (e: unknown) => unknown> = {};
  data = '';
  constructor(public nodeType: number, public localName: string) {}
  get firstChild(): Node0 | null { return this.childNodes[0] ?? null; }
  get nextSibling(): Node0 | null { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
  insertBefore(n: Node0, ref: Node0 | null) {
    n.parentNode?.removeChild(n);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n);
    n.parentNode = this;
    return n;
  }
  appendChild(n: Node0) { return this.insertBefore(n, null); }
  removeChild(n: Node0) { this.childNodes.splice(this.childNodes.indexOf(n), 1); n.parentNode = null; return n; }
  remove() { this.parentNode?.removeChild(this); }
  contains(n: Node0 | null): boolean { return !!n && (n === this || this.childNodes.some((c) => c.contains(n))); }
  setAttribute(k: string, v: unknown) { this.attrs[k] = String(v); }
  removeAttribute(k: string) { delete this.attrs[k]; }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  addEventListener(t: string, f: (e: unknown) => unknown) { this.ls[t] = f; }
  removeEventListener(t: string) { delete this.ls[t]; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  get textContent(): string { return this.nodeType === 3 ? this.data : this.childNodes.map((c) => c.textContent).join(''); }
}

const doc = {
  createElement: (t: string) => new Node0(1, t),
  createElementNS: (_: string, t: string) => new Node0(1, t),
  createTextNode: (s: string) => Object.assign(new Node0(3, '#text'), { data: String(s) }),
};

beforeAll(() => { (globalThis as Record<string, unknown>).document = doc; });

let root: Node0;
const mount = (vnode: preact.ComponentChild) => { root = new Node0(1, 'div'); act(() => render(vnode, root as unknown as Element)); };
afterEach(() => { act(() => render(null, root as unknown as Element)); vi.useRealTimers(); });

const all = (pred: (n: Node0) => boolean, n: Node0 = root): Node0[] =>
  [...(pred(n) ? [n] : []), ...n.childNodes.flatMap((c) => all(pred, c))];
const hasClass = (c: string) => (n: Node0) => (n.attrs.class ?? '').split(' ').includes(c);
const one = (pred: (n: Node0) => boolean) => { const r = all(pred); expect(r.length).toBe(1); return r[0]; };
const raw = (n: Node0, type: string, extra: Record<string, unknown> = {}) => {
  const k = Object.keys(n.ls).find((t) => t.toLowerCase().startsWith(type));
  if (!k) throw new Error(`no ${type} listener on <${n.localName} class="${n.attrs.class}">`);
  n.ls[k].call(n, { type: k, currentTarget: n, target: n, ...extra });
};
const fire = (n: Node0, type: string, extra: Record<string, unknown> = {}) => act(() => raw(n, type, extra));
const disabled = (n: Node0) => 'disabled' in n.attrs;

const last = (log: { states: State[] }) => log.states[log.states.length - 1];
const scene = (id: string) => ALL_SCENES.find((s) => s.id === id) as Scene;
const chOf = (id: string) => CHAPTERS[Number(id[0]) - 1];

/** 부모 흉내: onChange 로 state 를 들고 다시 그린다. */
function Host({ kind, sc, init, log }: { kind: 'compare' | 'bundle'; sc: Scene; init: State; log: { states: State[]; done: number } }) {
  const [s, setS] = useState(init);
  const onChange = (n: State) => { log.states.push(n); setS(n); };
  const onDone = () => { log.done++; };
  return kind === 'compare'
    ? <Compare chapter={chOf(sc.id)} state={s} scene={sc} onChange={onChange} onDone={onDone} />
    : <Bundle state={s} scene={sc} onChange={onChange} onDone={onDone} />;
}

describe('Compare (3-2)', () => {
  const sc = scene('3-2');
  const spots = sc.compare!.spots;
  const at = (x: number, y: number) => ({ clientX: x * 100, clientY: y * 100 });

  it('오답 탭: 패널티 없음(state 그대로·onChange 없음), 잔물결만', () => {
    const log = { states: [] as State[], done: 0 };
    mount(<Host kind="compare" sc={sc} init={initialState(0)} log={log} />);
    const after = one((n) => n.attrs['data-testid'] === 'after');
    fire(after, 'click', at(0.05, 0.95));
    expect(log.states).toHaveLength(0);
    expect(all(hasClass('ripple'))).toHaveLength(1);
    const k1 = all(hasClass('ripple'))[0];
    fire(after, 'click', at(0.06, 0.94)); // 연속 오답 → 새 잔물결(재시작)
    expect(all(hasClass('ripple'))).toHaveLength(1);
    expect(all(hasClass('ripple'))[0]).not.toBe(k1);
    expect(all((n) => n.localName === 'img' && hasClass('mark')(n) && !hasClass('abs')(n))).toHaveLength(0);
    expect(all(hasClass('found'))).toHaveLength(0);
  });

  it("'그만 보기'는 1곳 이상 찾은 뒤에만 활성, 같은 곳 재탭은 세지 않음, 다 찾으면 자동 진행", () => {
    vi.useFakeTimers();
    const log = { states: [] as State[], done: 0 };
    mount(<Host kind="compare" sc={sc} init={initialState(0)} log={log} />);
    const stop = () => one((n) => n.localName === 'button' && n.textContent === '그만 보기');
    expect(disabled(stop())).toBe(true);
    const after = one((n) => n.attrs['data-testid'] === 'after');
    fire(after, 'click', at(0.05, 0.95));
    expect(disabled(stop())).toBe(true);
    act(() => { raw(after, 'click', at(spots[0].x, spots[0].y)); raw(after, 'click', at(spots[0].x, spots[0].y)); }); // 같은 곳 연타
    expect(last(log).compareHits['3-2']).toBe(1);
    expect(disabled(stop())).toBe(false);
    expect(all(hasClass('spot-label')).map((n) => n.textContent)).toEqual([spots[0].label]);
    fire(after, 'click', at(spots[1].x, spots[1].y));
    fire(after, 'click', at(spots[2].x, spots[2].y));
    expect(last(log).compareHits['3-2']).toBe(3);
    expect(all(hasClass('found'))).toHaveLength(3);
    expect(log.done).toBe(0);
    fire(stop(), 'click'); // 자동 진행 대기 중 수동 탭
    act(() => { vi.advanceTimersByTime(1000); });
    expect(log.done).toBe(1);
  });

  it('2-4 그래프: 단일 계열, before 1막대·after 3막대', () => {
    mount(<Compare chapter={chOf('2-4')} state={initialState(0)} scene={scene('2-4')} onChange={() => {}} onDone={() => {}} />);
    const bars = (n: Node0) => all((x) => x.localName === 'i', n);
    expect(all(hasClass('graph')).map((g) => bars(g).length)).toEqual([1, 3]);
  });

  // T13: 시안 ③ — 왼쪽 띠·캡션·장 이름표, 오른쪽 제목 이름표·캡션. 문구는 content compare 그대로.
  it.each(['1-3', '2-4', '3-2', '4-1', '5-7'])('%s 캡션·제목·장 이름표', (id) => {
    const sc = scene(id); const ch = chOf(id);
    mount(<Compare chapter={ch} state={initialState(0)} scene={sc} onChange={() => {}} onDone={() => {}} />);
    expect(all(hasClass('cap')).map((n) => n.textContent)).toEqual([sc.compare!.captionA, sc.compare!.captionB]);
    expect(all(hasClass('nameplate')).map((n) => n.textContent)).toEqual([sc.compare!.title, `${ch.id}장 · ${ch.era}`]);
    expect(all(hasClass('strip'))).toHaveLength(1);
  });
});

describe('Bundle (5-1)', () => {
  const sc = scene('5-1');
  const tile = (id: string) => one((n) => n.attrs['data-item'] === id);

  it('4번째 선택은 가장 오래된 것과 교체(연타 안전), 칸 탭으로 빼기, 떠난다는 3칸일 때만', () => {
    const log = { states: [] as State[], done: 0 };
    mount(<Host kind="bundle" sc={sc} init={initialState(0)} log={log} />);
    expect(all((n) => n.attrs['data-item'] === 'spoon')).toHaveLength(0); // spoon_hidden 없음 → 숨김
    const go = () => one((n) => n.localName === 'button' && n.textContent === '떠난다');
    fire(tile('bundle'), 'click');
    fire(tile('book'), 'click');
    expect(disabled(go())).toBe(true);
    fire(tile('radish'), 'click');
    expect(disabled(go())).toBe(false);
    // 연타: 같은 타일 두 번 + 넷째 → 가장 오래된 bundle 이 빠지고 photo 가 들어감, 중복 없음
    // 연타 = 다시 그리기 전에 연달아 탭(같은 렌더의 리스너)
    act(() => { raw(tile('photo'), 'click'); raw(tile('photo'), 'click'); raw(tile('medicine'), 'click'); });
    expect(last(log).bundle).toEqual(['radish', 'photo', 'medicine']);
    const slot0 = all(hasClass('slot'))[0];
    fire(slot0, 'click');
    expect(last(log).bundle).toEqual(['photo', 'medicine']);
    expect(disabled(go())).toBe(true);
  });

  it('spoon_hidden 이면 놋수저 타일이 보인다', () => {
    const s = initialState(0);
    mount(<Bundle state={{ ...s, flags: { ...s.flags, spoon_hidden: true } }} scene={sc} onChange={() => {}} onDone={() => {}} />);
    expect(all((n) => n.attrs['data-item'] === 'spoon')).toHaveLength(1);
  });
});

describe('Letter (5-5)', () => {
  const sc = scene('5-5');
  const n = sc.letter!.lines.length;
  const lines = () => all(hasClass('line'));
  const card = () => one(hasClass('letter'));

  it('줄은 탭마다 한 줄, 스킵하면 전부', () => {
    mount(<Letter scene={sc} onDone={() => {}} />);
    expect(lines()).toHaveLength(1);
    fire(card(), 'click');
    expect(lines()).toHaveLength(2);
    expect(all(hasClass('mood'))).toHaveLength(0);
    fire(one(hasClass('skip')), 'click');
    expect(lines().map((l) => l.textContent)).toEqual(sc.letter!.lines);
    expect(all(hasClass('skip'))).toHaveLength(0);
    fire(card(), 'click'); // 다 보인 뒤 탭해도 넘치지 않음
    expect(lines()).toHaveLength(n);
  });

  it('마음 0개로 다음 → "하나 이상 골라요", 복수 선택 후 다음 → onDone', () => {
    const done = vi.fn();
    mount(<Letter scene={sc} onDone={done} />);
    for (let i = 1; i < n; i++) fire(card(), 'click');
    expect(lines()).toHaveLength(n);
    const next = () => one(hasClass('next'));
    fire(next(), 'click');
    expect(done).not.toHaveBeenCalled();
    expect(one((x) => x.attrs.role === 'status').textContent).toBe('하나 이상 골라요');
    const mood = (id: string) => one((x) => x.attrs['data-mood'] === id);
    fire(mood('fear'), 'click');
    fire(mood('return'), 'click');
    expect(hasClass('pressed')(mood('fear'))).toBe(true);
    expect(all((x) => x.attrs.role === 'status')).toHaveLength(0);
    fire(mood('fear'), 'click'); // 다시 누르면 해제
    fire(next(), 'click');
    expect(done).toHaveBeenCalledWith(['return']);
  });
});
