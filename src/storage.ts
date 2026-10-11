import type { State } from './types';
import { ALL_SCENES, CHAPTERS } from './content';

export const KEY = 'grandma-album/v1';

// localStorage 가 throw 하면(사생활 모드·용량 초과) 이 세션은 메모리에만 둔다.
let useMem = false;
let mem: string | null = null;

function get(): string | null {
  if (!useMem) try { return localStorage.getItem(KEY); } catch { useMem = true; }
  return mem;
}

function set(v: string): boolean {
  if (!useMem) try { localStorage.setItem(KEY, v); return true; } catch { useMem = true; }
  mem = v;
  return false;
}

export function clear(): void {
  try { localStorage.removeItem(KEY); } catch { /* 폴백 중이어도 기존 키 삭제는 시도 */ }
  mem = null;
}

/** 영구 저장에 성공했으면 true, 메모리 폴백이면 false. */
export function save(state: State): boolean {
  return set(JSON.stringify(state));
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown) => typeof v === 'string';
const strs = (v: unknown) => Array.isArray(v) && v.every(str);
const vals = (o: any, f: (v: unknown) => boolean) => Object.values(o).every(f);
const obj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);

// 참조 무결성: 저장본 id 는 콘텐츠에 있어야 한다(없는 id 로 화면이 장면을 열다 멈춘다).
const SCENE_IDS = new Set(ALL_SCENES.map((sc) => sc.id));
const COMPARE_IDS = new Set(ALL_SCENES.filter((sc) => sc.compare).map((sc) => sc.id));
const CANDIDATES = new Set(ALL_SCENES.flatMap((sc) => sc.bundle?.candidates ?? []));
const MOODS = new Set(ALL_SCENES.flatMap((sc) => sc.letter?.moods.map((m) => m.id) ?? []));
const refsOk = (s: State) => s.retryQueue.every((id) => SCENE_IDS.has(id))
  && s.answers.every((a) => SCENE_IDS.has(a.sceneId))
  && s.bundle.every((id) => CANDIDATES.has(id))
  && s.letterMoods.every((id) => MOODS.has(id))
  && Object.keys(s.compareHits).every((id) => COMPARE_IDS.has(id))
  && Object.keys(s.family).every((id) => CHAPTERS[s.chapter - 1].family.some((m) => m.id === id));

/** 저장은 장 시작에서만 하므로 sceneIdx 는 0. 모양이 하나라도 어긋나면 깨진 저장본. */
function valid(s: any): s is State {
  return s?.v === 1 && Number.isInteger(s.chapter) && s.chapter >= 1 && s.chapter <= 6 && s.sceneIdx === 0
    && obj(s.stats) && ['family', 'home', 'third'].every((k) => num(s.stats[k]) && s.stats[k] >= 0 && s.stats[k] <= 3)
    && obj(s.family) && vals(s.family, (v) => v === 'with' || v === 'apart' || v === 'unknown')
    && obj(s.flags) && obj(s.compareHits) && vals(s.compareHits, num) && num(s.playMs)
    && ['bundle', 'retryQueue', 'letterMoods'].every((k) => strs(s[k]))
    && Array.isArray(s.answers)
    && s.answers.every((a: any) => obj(a) && str(a.sceneId) && typeof a.correct === 'boolean' && typeof a.retried === 'boolean')
    && refsOk(s);
}

/** dropped = 깨진 저장본을 지웠음(화면이 토스트 한 줄을 띄운다). */
export function load(): { state: State | null; dropped: boolean } {
  const raw = get();
  if (raw === null) return { state: null, dropped: false };
  try {
    const s = JSON.parse(raw);
    if (valid(s)) return { state: s, dropped: false };
  } catch { /* 아래에서 삭제 */ }
  clear();
  return { state: null, dropped: true };
}
