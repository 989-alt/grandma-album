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

/** dropped = 깨진 저장본을 지웠음(화면이 토스트 한 줄을 띄운다). */
export function load(): { state: State | null; dropped: boolean } {
  const raw = get();
  if (raw === null) return { state: null, dropped: false };
  try {
    const s = JSON.parse(raw);
    if (s?.v === 1 && typeof s.chapter === 'number' && typeof s.sceneIdx === 'number' && s.stats && s.flags) {
      return { state: s as State, dropped: false };
    }
  } catch { /* 아래에서 삭제 */ }
  clear();
  return { state: null, dropped: true };
}
