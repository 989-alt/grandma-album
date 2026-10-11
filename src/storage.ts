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
  if (!useMem) try { localStorage.removeItem(KEY); } catch { useMem = true; }
  mem = null;
}

export function save(state: State): void {
  set(JSON.stringify(state));
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const obj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);

/** 저장은 장 시작에서만 하므로 sceneIdx 는 0. 모양이 하나라도 어긋나면 깨진 저장본. */
function valid(s: any): s is State {
  return s?.v === 1 && Number.isInteger(s.chapter) && s.chapter >= 1 && s.chapter <= 6 && s.sceneIdx === 0
    && obj(s.stats) && ['family', 'home', 'third'].every((k) => num(s.stats[k]))
    && obj(s.family) && obj(s.flags) && obj(s.compareHits) && num(s.playMs)
    && ['bundle', 'answers', 'retryQueue', 'letterMoods'].every((k) => Array.isArray(s[k]));
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
