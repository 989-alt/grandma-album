// 순수 함수 엔진: (state, …) → 새 state. DOM·Math.random·Date 없음, 입력 state 는 고치지 않는다.
// State.chapter = 1..6 장 번호, sceneIdx = 0 기반. family 맵에 없는 id 는 'with'.
import type { Choice, ClosingKey, Content, FamilyStatus, Flags, Scene, State, Stats } from '../types';

/** 시작 수치. PRD 에 값이 없어 잠정(보고서 NEEDS_CONTEXT). 셋째 축은 장이 바뀌어도 이어진다. */
export const INITIAL_STATS: Stats = { family: 2, home: 2, third: 1 };
const MAX = 3;

export function initialState(startedAt: number): State {
  return {
    v: 1, chapter: 1, sceneIdx: 0, stats: { ...INITIAL_STATS }, family: {},
    flags: { spoon: false, spoon_hidden: false, first_color: false },
    bundle: [], answers: [], retryQueue: [], compareHits: {}, letterMoods: [], startedAt, playMs: 0,
  };
}

const isLocked = (state: State, c: Choice) => !!c.lock && state.stats[c.lock.stat] < c.lock.min;

/** 보이는 카드(requiresFlag 없는 것). idx = scene.choices 원래 번호 → applyChoice 에 그대로. */
export function visibleChoices(state: State, scene: Scene): { idx: number; choice: Choice; locked: boolean }[] {
  return (scene.choices ?? [])
    .map((choice, idx) => ({ idx, choice, locked: isLocked(state, choice) }))
    .filter(({ choice }) => !choice.requiresFlag || state.flags[choice.requiresFlag]);
}

const clamp = (n: number) => Math.max(0, Math.min(MAX, n));

/** 잠김·숨김·없는 번호면 state 그대로 + ok:false. */
export function applyChoice(state: State, scene: Scene, choiceIdx: number): { ok: boolean; state: State } {
  const v = visibleChoices(state, scene).find((c) => c.idx === choiceIdx);
  if (!v || v.locked) return { ok: false, state };
  const { effects, flag, setFamily } = v.choice;
  const s = state.stats;
  return {
    ok: true,
    state: {
      ...state,
      stats: { family: clamp(s.family + effects.family), home: clamp(s.home + effects.home), third: clamp(s.third + effects.third) },
      flags: flag ? { ...state.flags, [flag]: true } : state.flags,
      family: setFamily ? { ...state.family, [setFamily.id]: setFamily.status } : state.family,
    },
  };
}

/** 장면 사건(autoFlag, event.setFamily). 두 번 불러도 같다. */
export function enterScene(state: State, scene: Scene): State {
  let st = state;
  if (scene.autoFlag) st = { ...st, flags: { ...st.flags, [scene.autoFlag]: true } };
  if (scene.event) st = { ...st, family: { ...st.family, [scene.event.setFamily.id]: scene.event.setFamily.status } };
  return st;
}

const chapterOf = (sceneId: string) => sceneId.split('-')[0];

/** initial: 고른 글자 배열(띄어쓰기 없이), ox: boolean. 첫 답만 answers 에 남는다(정답률 = 첫 답).
 *  오답이면 retryQueue 에 넣되 장당 1개, 이미 답한 문항(재출제 답)은 넣지 않는다. */
export function answerBack(state: State, scene: Scene, answer: string[] | boolean): { correct: boolean; state: State } {
  const b = scene.back;
  const correct = b.type === 'ox' ? answer === b.answer : Array.isArray(answer) && answer.join('') === b.answer.replace(/\s/g, '');
  if (state.answers.some((a) => a.sceneId === scene.id)) return { correct, state };
  const ch = chapterOf(scene.id);
  const queue = !correct && !state.retryQueue.some((id) => chapterOf(id) === ch) ? [...state.retryQueue, scene.id] : state.retryQueue;
  return { correct, state: { ...state, answers: [...state.answers, { sceneId: scene.id, correct, retried: false }], retryQueue: queue } };
}

/** 장 끝 재출제 문항 1개. 꺼낸 문항은 큐에서 빠지고 retried=true → 다시 나오지 않는다.
 *  answers 에 없는 id(answerBack 이 넣지 않은 것 = 깨진 저장본)는 건너뛴다(방어 — 저장본 검증이 1차). 엔진은 런타임 import 0 유지. */
export function retryAt(state: State, chapterId: string): { sceneId: string; state: State } | null {
  const sceneId = state.retryQueue.find((id) => chapterOf(id) === chapterId && state.answers.some((a) => a.sceneId === id));
  if (!sceneId) return null;
  return {
    sceneId,
    state: {
      ...state,
      retryQueue: state.retryQueue.filter((id) => id !== sceneId),
      answers: state.answers.map((a) => (a.sceneId === sceneId ? { ...a, retried: true } : a)),
    },
  };
}

// 5-1 bundle.requiresFlag { spoon: 'spoon_hidden' } 와 같다(테스트가 대조).
const BUNDLE_GATE: Record<string, keyof Flags> = { spoon: 'spoon_hidden' };

/** 보따리 3칸. 이미 든 것은 무시, 넷째는 가장 오래된 것과 교체, 놋수저는 spoon_hidden 일 때만. */
export function bundlePick(state: State, itemId: string): State {
  const gate = BUNDLE_GATE[itemId];
  if (state.bundle.includes(itemId) || (gate && !state.flags[gate])) return state;
  const b = [...state.bundle, itemId];
  return { ...state, bundle: b.length > 3 ? b.slice(1) : b };
}

/** 보따리 칸에서 빼기(T05 '칸 탭으로 빼기'). */
export function bundleDrop(state: State, itemId: string): State {
  return state.bundle.includes(itemId) ? { ...state, bundle: state.bundle.filter((i) => i !== itemId) } : state;
}

/** x·y 는 after 그림 정규화 좌표(0..1). found = 이미 찾은 spotIdx(화면이 도장 찍은 것) — 다시 맞혀도 세지 않는다. */
export function compareHit(state: State, scene: Scene, x: number, y: number, found: readonly number[] = []):
  { hit: true; spotIdx: number; state: State } | { hit: false; state: State } {
  const spotIdx = (scene.compare?.spots ?? []).findIndex((p, i) => !found.includes(i) && Math.hypot(p.x - x, p.y - y) <= p.r);
  if (spotIdx < 0) return { hit: false, state };
  return { hit: true, spotIdx, state: { ...state, compareHits: { ...state.compareHits, [scene.id]: (state.compareHits[scene.id] ?? 0) + 1 } } };
}

export type Next =
  | { type: 'scene'; sceneId: string; state: State }
  | { type: 'chapter'; sceneId: string; state: State } // 장이 바뀜: 화면은 지난 장 retryAt·outro 뒤 이 장면으로
  | { type: 'end'; state: State };

/** 다음 장면으로 state 를 옮긴다. 장이 바뀌면 family 맵을 새 장 가족으로(주인공이 같으면 상태를 이어 감),
 *  6장에 들어갈 때 오빠 = third ≥ 2 ? 'with' : 'unknown' (Ruling). */
export function nextScene(content: Content, state: State): Next {
  const ch = content.chapters[state.chapter - 1];
  if (state.sceneIdx + 1 < ch.scenes.length) {
    const st = { ...state, sceneIdx: state.sceneIdx + 1 };
    return { type: 'scene', sceneId: ch.scenes[st.sceneIdx].id, state: st };
  }
  const nx = content.chapters[state.chapter];
  if (!nx) return { type: 'end', state };
  const keep = nx.protagonist === ch.protagonist;
  const family: Record<string, FamilyStatus> = {};
  for (const m of nx.family) family[m.id] = keep ? state.family[m.id] ?? 'with' : 'with';
  if (state.chapter + 1 === 6) family.brother = state.stats.third >= 2 ? 'with' : 'unknown';
  return { type: 'chapter', sceneId: nx.scenes[0].id, state: { ...state, chapter: state.chapter + 1, sceneIdx: 0, family } };
}

const emptyFrames = (family: Record<string, FamilyStatus>) => Object.values(family).filter((s) => s !== 'with').length;

/** 빈 액자(apart+unknown) ≥ 2. */
export function isLossEnding(state: State): boolean {
  return emptyFrames(state.family) >= 2;
}

export interface Summary {
  playMs: number;
  reached: { chapter: number; sceneId: string };
  correctRate: number; // 0..1, 첫 답 기준
  wrong: string[]; // 첫 답이 틀린 문항(장면 id)
  family: { status: Record<string, FamilyStatus>; empty: number };
  items: { bundle: string[]; spoon: boolean };
  closingKey: ClosingKey;
}

/** 결과 7항. 말(놋수저 한 줄)은 items.spoon 으로 화면이 고른다. */
export function summarize(content: Content, state: State): Summary {
  const ch = content.chapters[state.chapter - 1];
  const status: Record<string, FamilyStatus> = {};
  for (const m of ch.family) status[m.id] = state.family[m.id] ?? 'with';
  const n = state.answers.length;
  return {
    playMs: state.playMs,
    reached: { chapter: state.chapter, sceneId: ch.scenes[state.sceneIdx].id },
    correctRate: n ? state.answers.filter((a) => a.correct).length / n : 0,
    wrong: state.answers.filter((a) => !a.correct).map((a) => a.sceneId),
    family: { status, empty: emptyFrames(status) },
    items: { bundle: [...state.bundle], spoon: state.flags.spoon_hidden },
    closingKey: (status.brother ?? 'with') === 'with' ? 'brother-with' : 'brother-apart',
  };
}
