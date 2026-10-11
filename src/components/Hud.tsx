// HUD: 초상 띠(strip) = 가족 초상 44×54 + 게이지 3줄(숫자 없음). 한 쪽 화면에선 이름표·사진첩 버튼까지(배치 A 자리 고정).
import type { Chapter, State, ThirdAxis } from '../types';
import { Btn, IMG, Nameplate, UI } from './Kit';

const THIRD_ICON: Record<ThirdAxis, string> = { new: 'lamp', language: 'brush', hope: 'sun' };
/** 게이지·태그 이름. 셋째 축은 장마다(새것 → 우리말 → 희망). */
export const statLabel = (chapter: Chapter) => ({ family: '가족', home: '살림', third: { new: '새것', language: '우리말', hope: '희망' }[chapter.thirdAxis] });
export const statIcon = (chapter: Chapter) => ({ family: 'hand', home: 'radish', third: THIRD_ICON[chapter.thirdAxis] });
const STAT_MAX = 3; // 엔진 MAX(engine/index.ts) — 살림·셋째 축 칸 수

/** 장 가족 + 주인공(가족 목록에 없으면). 1~2장 초상은 img/kit/family{장}-*, 3장부터 ui/kit/family-*, 주인공은 *-calm. */
export function members(chapter: Chapter) {
  const list = chapter.family.map((m) => ({ id: m.id, name: m.name }));
  if (!list.some((m) => m.id === chapter.protagonist)) list.push({ id: chapter.protagonist, name: '나' });
  return list.map((m) => ({ ...m, src: IMG[`family${chapter.id}-${m.id}`] ?? UI[`family-${m.id}`] ?? IMG[`${m.id}-calm`] }));
}

function Row({ icon, cls, cells, on, label }: { icon: string; cls: string; cells: number; on: number; label: string }) {
  return (
    <div class="gauge" role="img" aria-label={label}>
      <img src={UI[`icon-${icon}`]} alt="" />
      {Array.from({ length: cells }, (_, i) => <i key={i} class={i < on ? `on ${cls}` : ''} />)}
    </div>
  );
}

export function Strip({ chapter, state, left, top, width }: { chapter: Chapter; state: State; left: number; top: number; width: number }) {
  const ms = members(chapter);
  const status = (id: string) => state.family[id] ?? 'with';
  const label = statLabel(chapter);
  return (
    <div class="strip hud abs" style={{ left, top, width, height: 104 }}>
      <div class="family">
        {ms.map((m) => {
          const st = status(m.id);
          return st === 'unknown'
            ? <div key={m.id} class="slot" role="img" aria-label={`${m.name} 빈 액자`} />
            : <img key={m.id} class={st === 'apart' ? 'apart' : ''} src={m.src} alt={st === 'apart' ? `${m.name} 헤어짐` : m.name} />;
        })}
      </div>
      <div class="gauges">
        <Row icon="hand" cls="fam" cells={ms.length} on={ms.filter((m) => status(m.id) === 'with').length} label={label.family} />
        <Row icon="radish" cls="liv" cells={STAT_MAX} on={state.stats.home} label={label.home} />
        <Row icon={THIRD_ICON[chapter.thirdAxis]} cls="lang" cells={STAT_MAX} on={state.stats.third} label={label.third} />
      </div>
    </div>
  );
}

/** 한 쪽 화면 HUD: 띠 600×104 (42,42) + 이름표 "n장 · 연도" (658,70) + 사진첩 버튼 (870,58). */
export function Hud({ chapter, state, onAlbum }: { chapter: Chapter; state: State; onAlbum: () => void }) {
  return (
    <>
      <Strip chapter={chapter} state={state} left={42} top={42} width={600} />
      <Nameplate left={658} top={70} text={`${chapter.id}장 · ${chapter.era}`} />
      <Btn kind="indigo" label="사진첩" left={870} top={58} onClick={onAlbum} />
    </>
  );
}
