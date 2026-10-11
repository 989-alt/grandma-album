import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { State } from './types';

const fakeStorage = () => {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
};
const throwing = () => {
  const boom = () => { throw new DOMException('denied', 'SecurityError'); };
  return { length: 0, key: boom, getItem: boom, setItem: boom, removeItem: boom, clear: boom };
};

const state = (): State => ({
  v: 1, chapter: 3, sceneIdx: 0, stats: { family: 2, home: 1, third: 3 },
  family: { father: 'with', brother: 'unknown' },
  flags: { spoon: true, spoon_hidden: false, first_color: false },
  bundle: ['spoon', 'book', 'photo'], answers: [{ sceneId: '1-1', correct: true, retried: false }],
  retryQueue: ['2-3'], compareHits: { '4-1': 2 }, letterMoods: ['return'], startedAt: 0, playMs: 1234,
});

// 모듈 상태(메모리 폴백)를 테스트마다 새로 시작
const fresh = async () => { vi.resetModules(); return import('./storage'); };

describe('storage', () => {
  let ls: ReturnType<typeof fakeStorage>;
  beforeEach(() => { ls = fakeStorage(); vi.stubGlobal('localStorage', ls); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('save → load 왕복, 키는 grandma-album/v1 하나만', async () => {
    const st = await fresh();
    expect(st.load()).toEqual({ state: null, dropped: false });
    st.save(state());
    expect(ls.length).toBe(1);
    expect(ls.key(0)).toBe('grandma-album/v1');
    expect(st.load().state).toEqual(state());
    st.save({ ...state(), chapter: 4 });
    expect(ls.length).toBe(1);
    expect(st.load().state?.chapter).toBe(4);
  });

  it('clear 후 load 는 null', async () => {
    const st = await fresh();
    st.save(state());
    st.clear();
    expect(ls.length).toBe(0);
    expect(st.load()).toEqual({ state: null, dropped: false });
  });

  it.each(['{"v":1,', 'not json', '', 'null', '42', '"str"', '{}', JSON.stringify({ ...state(), v: 0 }), JSON.stringify({ ...state(), v: 2 }), '{"v":1}', '{"v":1,"chapter":"x"}', JSON.stringify({ ...state(), stats: undefined }), JSON.stringify({ ...state(), flags: null }),
    JSON.stringify({ ...state(), chapter: 99 }), JSON.stringify({ ...state(), family: undefined })])(
    '깨진 저장본 %j → 삭제 후 state null, dropped true', async (bad) => {
      const st = await fresh();
      ls.setItem('grandma-album/v1', bad);
      expect(st.load()).toEqual({ state: null, dropped: true });
      expect(ls.length).toBe(0);
      expect(st.load()).toEqual({ state: null, dropped: false });
    });

  it('localStorage 가 throw → 예외 없이 메모리 폴백으로 진행', async () => {
    vi.stubGlobal('localStorage', throwing());
    const st = await fresh();
    expect(() => st.load()).not.toThrow();
    expect(st.load().state).toBeNull();
    expect(() => st.save(state())).not.toThrow();
    expect(st.load().state).toEqual(state());
    expect(() => st.clear()).not.toThrow();
    expect(st.load().state).toBeNull();
  });

  it('localStorage 가 undefined(메서드 호출 시 TypeError) → 메모리 폴백', async () => {
    vi.stubGlobal('localStorage', undefined);
    const st = await fresh();
    expect(() => st.save(state())).not.toThrow();
    expect(st.load().state).toEqual(state());
  });

  it('setItem 만 throw(용량 초과) → 저장은 메모리로, 예외 없음', async () => {
    vi.stubGlobal('localStorage', { ...ls, getItem: ls.getItem, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } });
    const st = await fresh();
    expect(() => st.save(state())).not.toThrow();
    expect(st.load().state).toEqual(state());
  });

  it.each([
    ['answers:[null]', { answers: [null] }],
    ['answers sceneId 숫자', { answers: [{ sceneId: 1, correct: true, retried: false }] }],
    ['answers correct 누락', { answers: [{ sceneId: '1-1', retried: false }] }],
    ['retryQueue:[0]', { retryQueue: [0] }],
    ['bundle:[null]', { bundle: [null] }],
    ['letterMoods:[1]', { letterMoods: [1] }],
    ['compareHits 문자열', { compareHits: { '4-1': 'x' } }],
    ['family 낯선 값', { family: { father: 'dead' } }],
    ['stats 범위 밖', { stats: { family: 4, home: 1, third: 3 } }],
    ['retryQueue 없는 장면', { retryQueue: ['1-999'] }],
    ['answers 없는 장면', { answers: [{ sceneId: '9-9', correct: false, retried: false }] }],
    ['bundle 후보 밖', { bundle: ['flag'] }],
    ['letterMoods 5-5 밖', { letterMoods: ['x'] }],
    ['compareHits 비교 장면 아님', { compareHits: { '1-1': 1 } }],
    ['family 그 장 가족 밖', { family: { uncle: 'apart' } }],
  ])('원소 검증 %s → 처음부터', async (_n, patch) => {
    const st = await fresh();
    ls.setItem('grandma-album/v1', JSON.stringify({ ...state(), ...patch }));
    expect(st.load()).toEqual({ state: null, dropped: true });
    expect(ls.length).toBe(0);
  });

  it('setItem 만 용량 초과: save → clear → 새 load 는 null (기존 키도 삭제)', async () => {
    ls.setItem('grandma-album/v1', JSON.stringify(state()));
    vi.stubGlobal('localStorage', { ...ls, getItem: ls.getItem, removeItem: ls.removeItem, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } });
    const st = await fresh();
    st.save({ ...state(), playMs: 1 });
    st.clear();
    expect(ls.length).toBe(0);
    expect((await fresh()).load()).toEqual({ state: null, dropped: false });
  });
});
