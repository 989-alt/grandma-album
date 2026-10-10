import type { State } from './types';

export const KEY = 'grandma-album/v1';

// localStorage 가 throw 하면(사생활 모드·용량 초과) 이 세션은 메모리에만 둔다.
let useMem = false;
let mem: string | null = null;
/** 마지막 load() 가 깨진 저장본을 지웠는가 — 화면이 토스트 한 줄을 띄울 때 쓴다. */
export let dropped = false;

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

export function load(): State | null {
  dropped = false;
  const raw = get();
  if (raw === null) return null;
  try {
    const s = JSON.parse(raw);
    if (s?.v === 1) return s as State;
  } catch { /* 아래에서 삭제 */ }
  clear();
  dropped = true;
  return null;
}
