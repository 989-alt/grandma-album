import { describe, expect, it } from 'vitest';
import type { Content, Scene, State } from '../types';
import { ALL_SCENES, CHAPTERS, CLOSING, TERMS } from '../content/index';
import {
  answerBack, applyChoice, bundleDrop, bundlePick, compareHit, enterScene, initialState,
  isLossEnding, nextScene, retryAt, summarize, visibleChoices,
} from './index';
import { walk } from './walk';
import engineSrc from './index.ts?raw';
import walkSrc from './walk.ts?raw';

const content: Content = { chapters: CHAPTERS, terms: TERMS, closing: CLOSING };
const scene = (id: string): Scene => ALL_SCENES.find((s) => s.id === id)!;
const s0 = () => initialState(0);
const at = (chapter: number, sceneIdx: number, patch: Partial<State> = {}): State => ({ ...s0(), chapter, sceneIdx, ...patch });
const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
  return o;
};
const back = (id: string) => {
  const b = scene(id).back;
  return b.type === 'ox' ? b.answer : [...b.answer.replace(/\s/g, '')];
};
const wrongBack = (id: string) => {
  const b = scene(id).back;
  return b.type === 'ox' ? !b.answer : ['X'];
};

describe('순수성', () => {
  it('엔진 소스에 Math.random·Date·DOM 없음', () => {
    for (const raw of [engineSrc, walkSrc]) {
      const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // 주석 제외
      expect(src).not.toMatch(/Math\.random|\bDate\b|document\.|window\.|localStorage/);
    }
  });
  it('입력 state 를 고치지 않는다(얼린 state 로 전 함수 호출)', () => {
    const st = deepFreeze(at(3, 2, { flags: { spoon: true, spoon_hidden: true, first_color: false }, bundle: ['a', 'b', 'c'], retryQueue: ['3-1'], answers: [{ sceneId: '3-1', correct: false, retried: false }] }));
    expect(() => {
      applyChoice(st, scene('3-3'), 1);
      enterScene(st, scene('5-6'));
      answerBack(st, scene('3-3'), ['X']);
      retryAt(st, '3');
      bundlePick(st, 'spoon');
      bundleDrop(st, 'a');
      compareHit(st, scene('3-2'), 0.6, 0.3);
      nextScene(content, st);
      summarize(content, st);
    }).not.toThrow();
  });
});

describe('잠김: 장면당 ≤1, 조건은 stat≥min 만', () => {
  it('콘텐츠 정적: 잠금 카드 장면당 ≤1, lock 키는 stat·min 둘뿐', () => {
    for (const s of ALL_SCENES) {
      const locks = (s.choices ?? []).filter((c) => c.lock);
      expect(locks.length, s.id).toBeLessThanOrEqual(1);
      for (const c of locks) expect(Object.keys(c.lock!).sort()).toEqual(['min', 'stat']);
    }
  });
  it('3-3 서기 카드: home 1 이면 잠김(ok:false, state 그대로), home 2(=min) 면 열림', () => {
    const sc = scene('3-3');
    const low = at(3, 2, { stats: { family: 2, home: 1, third: 1 } });
    expect(visibleChoices(low, sc).map((v) => v.locked)).toEqual([false, false, true]);
    const r = applyChoice(low, sc, 2);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(low);
    const ok = at(3, 2, { stats: { family: 2, home: 2, third: 1 } });
    expect(visibleChoices(ok, sc).every((v) => !v.locked)).toBe(true);
    expect(applyChoice(ok, sc, 2).ok).toBe(true);
  });
  it('없는 번호는 ok:false', () => {
    expect(applyChoice(s0(), scene('1-1'), 9)).toEqual({ ok: false, state: s0() });
  });
  it('walk: 잠김 2개 이상 장면 0', () => {
    expect(walk(content).multiLock).toEqual([]);
  });
});

describe('visibleChoices · requiresFlag', () => {
  it('4-3 놋수저 카드는 spoon_hidden 없으면 숨김, 있으면 3장', () => {
    const sc = scene('4-3');
    expect(visibleChoices(at(4, 2), sc).map((v) => v.idx)).toEqual([1, 2]);
    const hid = at(4, 2, { flags: { spoon: false, spoon_hidden: true, first_color: false } });
    expect(visibleChoices(hid, sc).map((v) => v.idx)).toEqual([0, 1, 2]);
  });
  it('숨긴 카드는 applyChoice 도 거부', () => {
    const st = at(4, 2);
    expect(applyChoice(st, scene('4-3'), 0)).toEqual({ ok: false, state: st });
    expect(applyChoice(st, scene('4-3'), 2).state.stats.third).toBe(st.stats.third + 1);
  });
});

describe('applyChoice: 효과·클램프·플래그·가족', () => {
  const big = (d: number): Scene => ({
    ...scene('1-1'), choices: [{ text: 't', effects: { family: d, home: d, third: d }, setFamily: { id: 'father', status: 'unknown' } }],
  });
  it('+5 → 3, −5 → 0', () => {
    expect(applyChoice(s0(), big(5), 0).state.stats).toEqual({ family: 3, home: 3, third: 3 });
    expect(applyChoice(s0(), big(-5), 0).state.stats).toEqual({ family: 0, home: 0, third: 0 });
  });
  it('setFamily·flag 적용', () => {
    expect(applyChoice(s0(), big(0), 0).state.family.father).toBe('unknown');
    expect(applyChoice(s0(), scene('1-1'), 2).state.flags.spoon).toBe(true);
    expect(applyChoice(at(3, 4), scene('3-5'), 0).state.flags.spoon_hidden).toBe(true);
  });
});

describe('enterScene: 장면 사건', () => {
  it('5-6 아버지 apart 는 들어오기 전 상태와 무관', () => {
    for (const f of ['with', 'apart', 'unknown'] as const) {
      expect(enterScene(at(5, 5, { family: { father: f } }), scene('5-6')).family.father).toBe('apart');
    }
  });
  it('walk: 5-6 뒤 모든 경로·모든 결말에서 아버지 apart(위반 0)', () => {
    expect(walk(content).errors).toEqual([]);
  });
  it('4-1 first_color, 2-4 삼촌 apart, 두 번 불러도 같음', () => {
    const a = enterScene(at(4, 0), scene('4-1'));
    expect(a.flags.first_color).toBe(true);
    expect(enterScene(a, scene('4-1'))).toEqual(a);
    expect(enterScene(at(2, 3), scene('2-4')).family.uncle).toBe('apart');
  });
});

describe('answerBack · retryAt', () => {
  it('초성: 글자 배열(띄어쓰기 없음), O·X: boolean', () => {
    expect(answerBack(s0(), scene('1-2'), ['강', '화', '도', '조', '약']).correct).toBe(true);
    expect(answerBack(s0(), scene('1-2'), ['강', '화', '도', '약', '조']).correct).toBe(false);
    expect(answerBack(s0(), scene('1-1'), false).correct).toBe(true);
    expect(answerBack(s0(), scene('1-1'), true).correct).toBe(false);
    expect(answerBack(s0(), scene('1-2'), true).correct).toBe(false);
  });
  it('오답은 큐에, 장당 1개, 같은 문항 중복 없음', () => {
    let st = answerBack(s0(), scene('1-1'), wrongBack('1-1')).state;
    expect(st.retryQueue).toEqual(['1-1']);
    st = answerBack(st, scene('1-2'), wrongBack('1-2')).state;
    st = answerBack(st, scene('1-1'), wrongBack('1-1')).state;
    expect(st.retryQueue).toEqual(['1-1']);
    expect(st.answers.map((a) => a.sceneId)).toEqual(['1-1', '1-2']);
    st = answerBack(st, scene('2-1'), wrongBack('2-1')).state;
    expect(st.retryQueue).toEqual(['1-1', '2-1']);
  });
  it('재출제는 장 끝 1회: 꺼내면 큐에서 빠지고 retried, 재출제 오답도 다시 안 나옴', () => {
    let st = answerBack(s0(), scene('1-1'), wrongBack('1-1')).state;
    st = answerBack(st, scene('1-2'), wrongBack('1-2')).state;
    const q = retryAt(st, '1')!;
    expect(q.sceneId).toBe('1-1');
    expect(q.state.retryQueue).toEqual([]);
    expect(q.state.answers.find((a) => a.sceneId === '1-1')).toEqual({ sceneId: '1-1', correct: false, retried: true });
    const again = answerBack(q.state, scene('1-1'), wrongBack('1-1'));
    expect(again.correct).toBe(false);
    expect(again.state.retryQueue).toEqual([]);
    expect(again.state.answers).toEqual(q.state.answers); // 정답률은 첫 답 기준
    expect(retryAt(again.state, '1')).toBeNull();
    expect(answerBack(q.state, scene('1-1'), back('1-1')).correct).toBe(true);
  });
  it('다른 장 문항은 꺼내지 않음, 큐 비면 null', () => {
    const st = answerBack(s0(), scene('2-1'), wrongBack('2-1')).state;
    expect(retryAt(st, '1')).toBeNull();
    expect(retryAt(s0(), '1')).toBeNull();
    expect(retryAt(st, '2')!.sceneId).toBe('2-1');
  });
});

describe('보따리', () => {
  const hid = () => at(5, 0, { flags: { spoon: true, spoon_hidden: true, first_color: false } });
  it('콘텐츠 5-1 의 requiresFlag 와 엔진 규칙이 같다', () => {
    expect(scene('5-1').bundle!.requiresFlag).toEqual({ spoon: 'spoon_hidden' });
  });
  it('정확히 3칸, 넷째는 가장 오래된 것과 교체, 중복 무시', () => {
    let st = ['bundle', 'book', 'radish'].reduce(bundlePick, at(5, 0));
    expect(st.bundle).toEqual(['bundle', 'book', 'radish']);
    expect(bundlePick(st, 'book')).toBe(st);
    st = bundlePick(st, 'photo');
    expect(st.bundle).toEqual(['book', 'radish', 'photo']);
    expect(bundleDrop(st, 'radish').bundle).toEqual(['book', 'photo']);
  });
  it('놋수저는 spoon_hidden 일 때만', () => {
    const st = at(5, 0, { flags: { spoon: true, spoon_hidden: false, first_color: false } });
    expect(bundlePick(st, 'spoon')).toBe(st);
    expect(bundlePick(hid(), 'spoon').bundle).toEqual(['spoon']);
  });
});

describe('compareHit', () => {
  const sc = scene('1-3');
  it('반지름 안 미발견 스팟은 hit + compareHits++, 밖은 miss(패널티 없음)', () => {
    const r = compareHit(s0(), sc, 0.36, 0.66);
    expect(r).toMatchObject({ hit: true, spotIdx: 0 });
    expect(r.state.compareHits['1-3']).toBe(1);
    const m = compareHit(r.state, sc, 0.05, 0.05);
    expect(m.hit).toBe(false);
    expect(m.state).toBe(r.state);
  });
  it('이미 찾은 스팟(found)은 다시 세지 않음', () => {
    const r = compareHit(s0(), sc, 0.35, 0.65, [0]);
    expect(r.hit).toBe(false);
  });
});

describe('nextScene', () => {
  it('장 안에서는 sceneIdx+1', () => {
    const n = nextScene(content, at(1, 0));
    expect(n).toMatchObject({ type: 'scene', sceneId: '1-2' });
    expect(n.state.sceneIdx).toBe(1);
  });
  it('주인공이 바뀌면 가족 맵을 새 장 가족으로(2장 삼촌 apart 는 3장에 안 넘어감)', () => {
    const n = nextScene(content, at(2, 5, { family: { father: 'with', mother: 'with', uncle: 'apart' } }));
    expect(n).toMatchObject({ type: 'chapter', sceneId: '3-1' });
    expect(n.state.family).toEqual({ father: 'with', mother: 'with', brother: 'with', okbun: 'with', little: 'with' });
    expect(n.state.chapter).toBe(3);
    expect(n.state.sceneIdx).toBe(0);
  });
  it('6장 시작: third ≥ 2 오빠 with, 아니면 unknown. 아버지 apart 는 이어짐', () => {
    const fam = { father: 'apart', mother: 'with', brother: 'with', okbun: 'with', little: 'with' } as const;
    const hi = nextScene(content, at(5, 6, { family: { ...fam }, stats: { family: 2, home: 2, third: 2 } }));
    expect(hi.state.family).toMatchObject({ father: 'apart', brother: 'with' });
    expect(isLossEnding(hi.state)).toBe(false);
    const lo = nextScene(content, at(5, 6, { family: { ...fam }, stats: { family: 2, home: 2, third: 1 } }));
    expect(lo.state.family).toMatchObject({ father: 'apart', brother: 'unknown' });
    expect(isLossEnding(lo.state)).toBe(true);
  });
  it('6-2 뒤는 end', () => {
    expect(nextScene(content, at(6, 1)).type).toBe('end');
  });
});

describe('summarize', () => {
  it('결과 7항', () => {
    const st = at(6, 1, {
      playMs: 1800000, bundle: ['spoon', 'photo', 'book'],
      flags: { spoon: true, spoon_hidden: true, first_color: true },
      family: { father: 'apart', mother: 'with', brother: 'unknown', okbun: 'with', little: 'with' },
      answers: [{ sceneId: '1-1', correct: true, retried: false }, { sceneId: '1-2', correct: false, retried: true }, { sceneId: '1-3', correct: true, retried: false }, { sceneId: '1-4', correct: true, retried: false }],
    });
    expect(summarize(content, st)).toEqual({
      playMs: 1800000,
      reached: { chapter: 6, sceneId: '6-2' },
      correctRate: 0.75,
      wrong: ['1-2'],
      family: { status: st.family, empty: 2 },
      items: { bundle: ['spoon', 'photo', 'book'], spoon: true },
      closingKey: 'brother-apart',
    });
    expect(CLOSING.variants[summarize(content, st).closingKey]).toHaveLength(2);
  });
  it('오빠 with 면 brother-with, 빈 액자 1', () => {
    const st = at(6, 1, { family: { father: 'apart', mother: 'with', brother: 'with', okbun: 'with', little: 'with' } });
    expect(summarize(content, st)).toMatchObject({ closingKey: 'brother-with', family: { empty: 1 }, correctRate: 0, wrong: [] });
  });
});

describe('walk', () => {
  it('30장면·30문항, 데드엔드 0, 상실 결말 ≤ 50%', () => {
    const r = walk(content);
    expect(r.scenes).toBe(30);
    expect(r.backs).toBe(30);
    expect(r.deadEnds).toEqual([]);
    expect(r.lossRatio).toBeLessThanOrEqual(0.5);
    expect(r.lossPaths).toBeGreaterThan(0n); // brother-apart 결말도 도달
  });
  it('결정성: 2회 실행 해시 동일, 콘텐츠 불변', () => {
    const before = JSON.stringify(CHAPTERS);
    const a = walk(content);
    const b = walk(content);
    expect(a.hash).toBe(b.hash);
    expect(a.paths).toBe(b.paths);
    expect(JSON.stringify(CHAPTERS)).toBe(before);
  });
});
