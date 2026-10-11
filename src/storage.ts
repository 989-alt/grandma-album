import type { State } from './types';

export const KEY = 'grandma-album/v1';

// localStorage 가 throw 하면(사생활 모드·용량 초과) 이 세션은 메모리에만 둔다.
let useMem = false;
let mem: string | null = null;

function get(): string | null {
  if (!useMem) try { return localStorage.getItem(KEY); } catch { useMem = true; }
  return mem;
}

function set(v: string): void {
  if (!useMem) try { localStorage.setItem(KEY, v); return; } catch { useMem = true; }
  mem = v;
}

export function clear(): void {
  try { localStorage.removeItem(KEY); } catch { /* 폴백 중이어도 기존 키 삭제는 시도 */ }
  mem = null;
}

export function save(state: State): void {
  set(JSON.stringify(state));
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown) => typeof v === 'string';
const strs = (v: unknown) => Array.isArray(v) && v.every(str);
const vals = (o: any, f: (v: unknown) => boolean) => Object.values(o).every(f);
const obj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);

/** 저장은 장 시작에서만 하므로 sceneIdx 는 0. 모양이 하나라도 어긋나면 깨진 저장본. */
function valid(s: any): s is State {
  return s?.v === 1 && Number.isInteger(s.chapter) && s.chapter >= 1 && s.chapter <= 6 && s.sceneIdx === 0
    && obj(s.stats) && ['family', 'home', 'third'].every((k) => num(s.stats[k]) && s.stats[k] >= 0 && s.stats[k] <= 3)
    && obj(s.family) && vals(s.family, (v) => v === 'with' || v === 'apart' || v === 'unknown')
    && obj(s.flags) && obj(s.compareHits) && vals(s.compareHits, num) && num(s.playMs)
    && ['bundle', 'retryQueue', 'letterMoods'].every((k) => strs(s[k]))
    && Array.isArray(s.answers)
    && s.answers.every((a: any) => obj(a) && str(a.sceneId) && typeof a.correct === 'boolean' && typeof a.retried === 'boolean');
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
