// 5-5 학도병 편지(배치 C 몸통, 카드 자리에 편지 본문). 탭마다 한 줄, '다 보기'로 전부.
// 다 보이면 마음 3(복수 선택, 눌림 = 선택) + '다음'. 0개로 '다음' → 한 줄 쪽지.
import { useState } from 'preact/hooks';
import type { Scene } from '../types';
import '../styles/compare.css';

export function Letter({ scene, src, onDone }: { scene: Scene; src?: string; onDone: (moods: string[]) => void }) {
  const lines = scene.letter?.lines ?? [];
  const moods = scene.letter?.moods ?? [];
  const [shown, setShown] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [nudge, setNudge] = useState(false);
  const done = shown >= lines.length;

  const toggle = (id: string) => {
    setNudge(false);
    setPicked((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));
  };
  const next = () => (picked.length ? onDone(picked) : setNudge(true));

  return (
    <div class="gx screen-letter">
      <div class="panel abs" style={{ inset: '0' }}>
        <div class="inner">
          <div class="frame abs" style={{ left: '42px', top: '162px', width: '420px', height: '280px' }}>
            <div class="pic">{src && <img src={src} alt="" />}</div>
          </div>
          <button type="button" class="card letter abs" style={{ left: '478px', top: '162px', width: '512px', height: '460px' }}
            onClick={() => setShown((n) => Math.min(n + 1, lines.length))}>
            {lines.slice(0, shown).map((l, i) => <span key={i} class="line">{l}</span>)}
          </button>
          {!done && (
            <button type="button" class="key wide abs skip" style={{ left: '830px', top: '650px' }} onClick={() => setShown(lines.length)}>
              <span>다 보기</span>
            </button>
          )}
          {done && moods.map((m, i) => (
            <button key={m.id} type="button" class={picked.includes(m.id) ? 'btn paper pressed abs mood' : 'btn paper abs mood'}
              aria-pressed={picked.includes(m.id)} data-mood={m.id}
              style={{ left: '42px', top: `${462 + 88 * i}px`, width: '420px' }} onClick={() => toggle(m.id)}>
              <span>{m.text}</span>
            </button>
          ))}
          {done && nudge && <p role="status" class="nudge abs" style={{ left: '478px', top: '676px', margin: '0' }}>하나 이상 골라요</p>}
          {done && (
            <button type="button" class="btn amber abs next" style={{ left: '870px', top: '650px', width: '120px' }} onClick={next}>
              <span>다음</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
