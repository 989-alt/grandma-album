// 선택 카드 2~3(세로 열, 손글씨 28). 첫 탭만 반영하고 이후 전부 disabled. 잠김 = pressed 카드 + 자물쇠 + 흐린 글 + 힌트 태그 1줄, 탭 불가.
import { useState } from 'preact/hooks';
import { visibleChoices } from '../engine';
import type { Chapter, Scene, State, StatKey } from '../types';
import { UI } from './Kit';
import { statIcon, statLabel } from './Hud';

const KEYS: StatKey[] = ['family', 'home', 'third'];

export function Choices({ chapter, scene, state, onChoose }: { chapter: Chapter; scene: Scene; state: State; onChoose: (idx: number) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const label = statLabel(chapter);
  const icon = statIcon(chapter);
  const pick = (idx: number) => {
    if (chosen !== null) return;
    setChosen(idx);
    onChoose(idx);
  };
  return (
    <div class="cards abs" style={{ left: 540, top: 158 }}>
      {visibleChoices(state, scene).map(({ idx, choice, locked }) => (
        <button
          key={idx}
          type="button"
          class={`card${locked ? ' locked' : ''}${chosen === idx ? ' chosen' : chosen !== null ? ' idle' : ''}`}
          disabled={locked || chosen !== null}
          onClick={() => !locked && pick(idx)}
        >
          <span class="text">{choice.text}</span>
          <span class="tags">
            {locked && choice.lock
              ? <span class="tag locked"><img src={UI['icon-lock']} alt="" />{`${label[choice.lock.stat]} ${choice.lock.min}칸 필요`}</span>
              : KEYS.filter((k) => choice.effects[k]).map((k) => (
                <span key={k} class="tag"><img src={UI[`icon-${icon[k]}`]} alt="" />{`${label[k]} ${choice.effects[k] > 0 ? '+' : '−'}${Math.abs(choice.effects[k])}`}</span>
              ))}
            {choice.risk && <span class="tag"><img src={UI['icon-lock']} alt="" />들키면 큰일</span>}
          </span>
          {locked && <img class="lock" src={UI['icon-lock']} alt="잠김" />}
        </button>
      ))}
    </div>
  );
}
