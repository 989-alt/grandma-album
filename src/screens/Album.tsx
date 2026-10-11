// S2 사진첩(배치 B 두 쪽). 펼침 = [1·2장] [3·4장] [5·6장] [뒤표지 낱말 주머니].
// 칸: 지난 장면 = 작은 사진 틀(탭 → 뒷면 열람), 지금 장면 = 빈 칸 반짝임(탭 → 장면), 나머지 빈 칸. 장을 다 채우면 봉인.
// 3초 무입력이면 반짝이는 빈 칸 옆에 손(icon-hand) 깜빡임, 입력 즉시 제거.
import { useEffect, useState } from 'preact/hooks';
import { CHAPTERS, TERMS } from '../content';
import type { Chapter, Scene, State } from '../types';
import { Strip } from '../components/Hud';
import { Nameplate, UI, Wide } from '../components/Kit';
import { PhotoBack } from '../components/PhotoBack';

const chapters = CHAPTERS as unknown as Chapter[];
const SPREADS = 4; // 3 펼침 + 뒤표지

// 작은 틀(테두리 27px) 안 사진: 틀 안 연필선(가장자리 10px)까지 꽉 채우고, 네 모서리는 삼각형으로 잘라 금속 모서리 밑에 끼운 것처럼.
const C = 'calc(100% - 15px)';
const THUMB = {
  position: 'absolute', left: -17, top: -17, width: 'calc(100% + 34px)', height: 'calc(100% + 34px)', objectFit: 'cover',
  clipPath: `polygon(15px 0, ${C} 0, 100% 15px, 100% ${C}, ${C} 100%, 15px 100%, 0 ${C}, 0 15px)`,
} as const;

export function Album({ state, onOpen, onTerm, photoSrc }: {
  state: State; onOpen: () => void; onTerm?: (word: string) => void; photoSrc?: (sceneId: string) => string | undefined;
}) {
  const [spread, setSpread] = useState(Math.floor((state.chapter - 1) / 2));
  const [viewing, setViewing] = useState<Scene | null>(null);
  const [term, setTerm] = useState<number | null>(null);
  const [idle, setIdle] = useState(false);
  const [poke, setPoke] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setIdle(true), 3000);
    return () => clearTimeout(t);
  }, [poke]);
  const input = () => { setIdle(false); setPoke((n) => n + 1); };

  if (viewing) {
    return (
      <div class="screen panel" onPointerDown={input} onKeyDown={input}><div class="inner">
        <PhotoBack scene={viewing} nextLabel="사진첩" onNext={() => setViewing(null)} />
      </div></div>
    );
  }

  let hand: { left: number; top: number } | null = null;
  const page = (ci: number, side: 0 | 1) => {
    const ch = chapters[ci];
    const x0 = side ? 550 : 42;
    const y0 = side ? 160 : 250;
    const done = ci + 1 < state.chapter;
    return (
      <>
        <Nameplate left={side ? 666 : 158} top={side ? 96 : 190} text={`${ch.id}장 · ${ch.era}`} />
        {ch.scenes.map((sc, i) => {
          const left = x0 + (i % 3) * 144;
          const top = y0 + Math.floor(i / 3) * 116;
          const pos = { left, top, width: 130, height: 100 };
          if (done || (ci + 1 === state.chapter && i < state.sceneIdx)) {
            const src = photoSrc?.(sc.id);
            return (
              <button key={sc.id} type="button" class="frame sm abs" style={pos} aria-label={`${sc.id} 사진 뒷면 보기`} onClick={() => setViewing(sc as Scene)}>
                {src && <img src={src} alt="" style={THUMB} />}
              </button>
            );
          }
          if (ci + 1 === state.chapter && i === state.sceneIdx) {
            hand = { left: left + 37, top: top + 34 }; // 칸 가운데(옆 칸·쪽 경계를 넘지 않게)
            return <button key={sc.id} type="button" class="slot sm glow abs" style={pos} aria-label={`${sc.id} 사진 붙이기`} onClick={onOpen} />;
          }
          return <div key={sc.id} class="slot sm abs" style={pos} />;
        })}
        {done && <img class="abs" src={UI.seal} alt={`${ch.id}장 끝`} style={side ? { left: 896, top: 520, width: 64 } : { left: 388, top: 620, width: 64 }} />}
      </>
    );
  };

  const cover = spread === SPREADS - 1;
  const t = term === null ? null : TERMS[term];
  return (
    <div class="screen" onPointerDown={input} onKeyDown={input}>
      <div class="page panel" style={{ left: 8 }} />
      <div class="page panel" style={{ left: 516 }} />
      {cover ? (
        <>
          <img class="abs" src={UI['icon-pouch']} alt="" style={{ left: 60, top: 84, width: 72 }} />
          <Nameplate left={158} top={96} text="낱말 주머니" />
          <div class="terms abs" style={{ left: 42, top: 180 }}>
            {TERMS.map((w, i) => (
              <button key={w.word} type="button" class={`key wide term${term === i ? ' on' : ''}`} aria-pressed={term === i}
                onClick={() => { setTerm(i); onTerm?.(w.word); }}>
                <span>{w.word}</span>
              </button>
            ))}
          </div>
          {t && (
            <>
              <Nameplate left={666} top={96} text={t.word} />
              <div class="meaning abs" style={{ left: 550, top: 180, width: 432 }}>{t.meaning}</div>
            </>
          )}
        </>
      ) : (
        <>
          <Strip chapter={chapters[state.chapter - 1]} state={state} left={42} top={68} width={432} />
          {page(spread * 2, 0)}
          {page(spread * 2 + 1, 1)}
        </>
      )}
      {spread > 0 && <Wide label="앞쪽" left={42} top={650} onClick={() => setSpread(spread - 1)} />}
      {spread < SPREADS - 1 && <Wide label="뒤쪽" left={822} top={650} onClick={() => setSpread(spread + 1)} />}
      {idle && hand && <img class="hint-hand" src={UI['icon-hand']} alt="" style={hand} />}
    </div>
  );
}
