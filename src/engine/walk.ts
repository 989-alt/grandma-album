// 상태 공간 전수 탐색(PRD §6-1·6). 장면은 한 줄로 이어지므로 장면 하나씩 층으로 넘긴다.
// 중복 제거 키 = (장면, stats, family, flags, bundle). 경로 수 = 선택지 × 보따리 조합(결말을 바꾸는 분기).
// 답·비교는 결말 키를 바꾸지 않으므로 전부 돌리되 경로 수에는 곱하지 않는다(n=0 으로 합침).
import type { Content, Scene, State } from '../types';
import { answerBack, applyChoice, bundlePick, compareHit, enterScene, initialState, isLossEnding, nextScene, retryAt, visibleChoices } from './index';

export interface WalkResult {
  scenes: number;
  backs: number;
  deadEnds: string[];
  multiLock: string[];
  endStates: number;
  paths: bigint;
  lossPaths: bigint;
  lossRatio: number;
  errors: string[];
  hash: string;
}

type Node = { st: State; n: bigint };

const keyOf = (s: State) =>
  JSON.stringify([s.chapter, s.sceneIdx, s.stats, Object.entries(s.family).sort(), s.flags, s.bundle]);

const combos = (xs: string[], k: number): string[][] =>
  k === 0 ? [[]] : xs.flatMap((x, i) => combos(xs.slice(i + 1), k - 1).map((c) => [x, ...c]));

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function answers(scene: Scene): { right: string[] | boolean; wrong: string[] | boolean } {
  const b = scene.back;
  if (b.type === 'ox') return { right: b.answer, wrong: !b.answer };
  const right = [...b.answer.replace(/\s/g, '')];
  return { right, wrong: [...right].reverse() };
}

export function walk(content: Content): WalkResult {
  const errors: string[] = [];
  const reached = new Set<string>();
  const backs = new Set<string>();
  const deadEnds: string[] = [];
  const multiLock = new Set<string>();
  const ends: Node[] = [];

  for (const s of content.chapters.flatMap((c) => c.scenes)) {
    const locks = (s.choices ?? []).filter((c) => c.lock);
    if (locks.length > 1) errors.push(`${s.id}: 잠금 카드 ${locks.length}개`);
    for (const c of locks) if (Object.keys(c.lock!).sort().join() !== 'min,stat') errors.push(`${s.id}: 잠금 조건이 stat≥min 이 아님`);
    if (s.back.type === 'initial') for (const ch of s.back.answer.replace(/\s/g, '')) if (!s.back.keys.includes(ch)) errors.push(`${s.id}: 열쇠에 '${ch}' 없음`);
  }

  let layer = new Map<string, Node>();
  const s0 = initialState(0);
  layer.set(keyOf(s0), { st: s0, n: 1n });

  while (layer.size) {
    const next = new Map<string, Node>();
    const add = (st: State, n: bigint) => {
      const k = keyOf(st);
      const cur = next.get(k);
      if (cur) cur.n += n; else next.set(k, { st, n });
    };

    for (const { st: st0, n } of layer.values()) {
      const ch = content.chapters[st0.chapter - 1];
      const scene = ch.scenes[st0.sceneIdx];
      reached.add(scene.id);
      let br: Node[] = [{ st: enterScene(st0, scene), n }];

      if (scene.choices) {
        br = br.flatMap(({ st, n }) => {
          const vis = visibleChoices(st, scene);
          if (vis.filter((v) => v.locked).length >= 2) multiLock.add(scene.id);
          const open = vis.filter((v) => !v.locked);
          if (!open.length) deadEnds.push(`${scene.id} ${keyOf(st)}`);
          return open.map((v) => {
            const r = applyChoice(st, scene, v.idx);
            if (!r.ok) errors.push(`${scene.id}: 열린 카드 ${v.idx} 거부`);
            return { st: r.state, n };
          });
        });
      }

      if (scene.bundle) {
        const bundle = scene.bundle;
        br = br.flatMap(({ st, n }) => {
          const out = combos(bundle.candidates, 3)
            .map((c) => ({ c, s: c.reduce(bundlePick, { ...st, bundle: [] }) }))
            .filter(({ c, s }) => {
              const gated = c.some((i) => bundle.requiresFlag[i] && !st.flags[bundle.requiresFlag[i]]);
              const ok = s.bundle.length === 3 && new Set(s.bundle).size === 3;
              if (gated === ok) errors.push(`${scene.id}: 보따리 ${c} 잠금 불일치`);
              return ok;
            });
          if (!out.length) deadEnds.push(`${scene.id} 보따리 ${keyOf(st)}`);
          return out.map(({ s }) => ({ st: s, n }));
        });
      }

      if (scene.compare) {
        const spots = scene.compare.spots;
        br = br.flatMap(({ st, n }) =>
          spots.map((_, k) => {
            let s = st;
            const found: number[] = [];
            for (let i = 0; i <= k; i++) {
              const r = compareHit(s, scene, spots[i].x, spots[i].y, found);
              if (!r.hit || r.spotIdx !== i) errors.push(`${scene.id}: 스팟 ${i} 못 맞힘`);
              else { found.push(i); s = r.state; }
            }
            if ((s.compareHits[scene.id] ?? 0) !== k + 1) errors.push(`${scene.id}: compareHits ${s.compareHits[scene.id]} ≠ ${k + 1}`);
            return { st: s, n: k === 0 ? n : 0n };
          }));
      }

      const a = answers(scene);
      br = br.flatMap(({ st, n }) => {
        backs.add(scene.id);
        const w = answerBack(st, scene, a.wrong);
        const r = answerBack(st, scene, a.right);
        if (w.correct || !r.correct) errors.push(`${scene.id}: 뒷면 판정 오류`);
        return [{ st: w.state, n }, { st: r.state, n: 0n }];
      });

      if (st0.sceneIdx === ch.scenes.length - 1) {
        br = br.flatMap(({ st, n }) => {
          const q = retryAt(st, ch.id);
          if (!q) return [{ st, n }];
          const rs = ch.scenes.find((s) => s.id === q.sceneId)!;
          if (retryAt(q.state, ch.id)) errors.push(`${ch.id}장: 재출제 두 번`);
          const aa = answers(rs);
          const w = answerBack(q.state, rs, aa.wrong);
          if (w.state.retryQueue.includes(rs.id)) errors.push(`${rs.id}: 재출제 오답이 다시 큐에`);
          return [{ st: w.state, n }, { st: answerBack(q.state, rs, aa.right).state, n: 0n }];
        });
      }

      if (scene.id === '5-6') for (const { st } of br) if (st.family.father !== 'apart') errors.push(`5-6 뒤 아버지 ${st.family.father}`);

      for (const { st, n } of br) {
        const nx = nextScene(content, st);
        if (nx.type === 'end') ends.push({ st, n });
        else add(nx.state, n);
      }
    }
    layer = next;
  }

  for (const { st } of ends) if (st.family.father !== 'apart') errors.push(`결말 아버지 ${st.family.father}`);
  const paths = ends.reduce((t, e) => t + e.n, 0n);
  const lossPaths = ends.filter((e) => isLossEnding(e.st)).reduce((t, e) => t + e.n, 0n);
  const lossRatio = paths ? Number((lossPaths * 1000000n) / paths) / 1000000 : 0;
  const hash = fnv1a(JSON.stringify([[...reached], ends.map((e) => [e.st, e.n.toString()])]));

  return {
    scenes: reached.size, backs: backs.size, deadEnds, multiLock: [...multiLock],
    endStates: ends.length, paths, lossPaths, lossRatio, errors: [...new Set(errors)], hash,
  };
}
