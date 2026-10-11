// 5-1 보따리(배치 C 몸통). 3칸 + 후보 6 타일. 탭으로 넣기(넷째는 가장 오래된 것과 교체 = 엔진 bundlePick),
// 칸 탭으로 빼기(bundleDrop). 놋수저 타일은 spoon_hidden 없으면 숨김. 3칸 차면 '떠난다'.
import { useRef } from 'preact/hooks';
import { bundleDrop, bundlePick } from '../engine';
import type { Scene, State } from '../types';
import note from '../../assets/ui/kit/speech-note.png';
import grandma from '../../assets/ui/kit/portrait-grandma.png';
import bundleIcon from '../../assets/ui/kit/icon-bundle.png';
import spoon from '../../assets/img/kit/item-spoon.png';
import bundle from '../../assets/img/kit/item-bundle.png';
import book from '../../assets/img/kit/item-book.png';
import radish from '../../assets/img/kit/item-radish.png';
import photo from '../../assets/img/kit/item-photo.png';
import medicine from '../../assets/img/kit/item-medicine.png';
import '../styles/compare.css';

const ITEM: Record<string, string> = { spoon, bundle, book, radish, photo, medicine };

export function Bundle({ state, scene, src, onChange, onDone }: {
  state: State; scene: Scene; src?: string; onChange: (s: State) => void; onDone: () => void;
}) {
  const cfg = scene.bundle;
  // 연타가 부모 재렌더보다 빠를 수 있어 최신 state 를 ref 로 들고 간다
  const cur = useRef(state);
  const seen = useRef(state);
  if (seen.current !== state) { seen.current = state; cur.current = state; }
  const apply = (s: State) => { if (s !== cur.current) { cur.current = s; onChange(s); } };

  const gate = cfg?.requiresFlag ?? {};
  const tiles = (cfg?.candidates ?? []).filter((id) => !gate[id] || state.flags[gate[id]]);
  const slots = cfg?.slots ?? 3;

  return (
    <div class="gx screen-bundle">
      <div class="panel abs" style={{ inset: '0' }}>
        <div class="inner">
          <div class="frame abs" style={{ left: '42px', top: '162px', width: '420px', height: '280px' }}>
            <div class="pic">{src && <img src={src} alt="" />}</div>
          </div>
          <div class="note abs" style={{ left: '478px', top: '162px', width: '512px', height: '228px' }}>
            <img class="paper" src={note} alt="" />
            <div class="portrait" style={{ left: '27px', top: '32px', width: '149px', height: '149px' }}>
              <img src={grandma} alt="할머니" />
            </div>
            <div class="say" style={{ left: '204px', top: '18px', width: '277px' }}>{scene.narration}</div>
          </div>
          {Array.from({ length: slots }, (_, i) => {
            const id = state.bundle[i];
            return (
              <button key={i} type="button" class="key lg abs slot" style={{ left: `${42 + 100 * i}px`, top: '484px' }}
                disabled={!id} onClick={() => id && apply(bundleDrop(cur.current, id))}>
                {id && <img src={ITEM[id]} alt={id} />}
              </button>
            );
          })}
          <img class="abs" src={bundleIcon} alt="" style={{ left: '346px', top: '500px', width: '56px' }} />
          {tiles.map((id, i) => {
            const taken = state.bundle.includes(id);
            return (
              <button key={id} type="button" class={taken ? 'key lg abs tile taken' : 'key lg abs tile'} data-item={id}
                aria-pressed={taken} style={{ left: `${420 + 96 * i}px`, top: '484px' }}
                onClick={() => apply(bundlePick(cur.current, id))}>
                <img src={ITEM[id]} alt={id} />
              </button>
            );
          })}
          <button type="button" class="btn amber abs" style={{ left: '870px', top: '650px', width: '120px' }}
            disabled={state.bundle.length < slots} onClick={onDone}>
            <span>떠난다</span>
          </button>
        </div>
      </div>
    </div>
  );
}
