// 사진 뒷면(배치 C 뒷면). 초성 = 열쇠(back.keys) 탭 → 빈칸에 차례로, 글자 수가 차면 판정. 채워진 빈칸 탭 = 마지막 글자 빼기. O·X = key-wide 둘.
// 판정: stamp-ok/wrong(0.3초) + 글자 또렷/흐림. 오답이면 할머니 교정 쪽지. 그 뒤 '다음 사진'.
// judge 가 없으면 읽기 전용(사진첩에서 지난 사진 뒤집기): 답을 채워 보여 준다.
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import type { Scene } from '../types';
import { Nameplate, Note, UI, Wide } from './Kit';

type Answer = string[] | boolean;

const where = (scene: Scene) => `사진 뒷면 · ${scene.id} · ${scene.id === '5-5' ? '지도서' : '교과서'} ${scene.back.source.join('·')}쪽`;

export function PhotoBack({ scene, judge, onNext, nextLabel = '다음 사진', moods = [] }: {
  scene: Scene; judge?: (a: Answer) => boolean; onNext: () => void; nextLabel?: string;
  /** 편지에서 고른 마음(state.letterMoods) — back.afterNote 고르기용 */
  moods?: string[];
}) {
  const b = scene.back;
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<{ answer: Answer; correct: boolean } | null>(null);
  const readOnly = !judge;
  const done = readOnly || result !== null;

  const answer = (a: Answer) => {
    if (result || !judge) return;
    setResult({ answer: a, correct: judge(a) });
  };

  const undo = () => setPicked((p) => p.slice(0, -1));
  let line;
  if (b.type === 'initial') {
    const words = b.answer.split(' ');
    const hints = b.hint.split(' ');
    const chars = words.join('');
    const [pre, post = ''] = b.prompt.split('___');
    let n = 0;
    line = (
      <div class="line">
        {pre}
        {words.map((w, wi) => (
          <Fragment key={wi}>
            {wi > 0 && <span class="gap" />}
            {[...w].map((_, ci) => {
              const i = n++;
              const k = picked[i];
              const ch = readOnly ? chars[i] : k !== undefined ? b.keys[k] : hints[wi]?.[ci] ?? '';
              const filled = readOnly || k !== undefined;
              return <span key={i} class={`blank${filled ? ' filled' : ''}${result && !result.correct ? ' faint' : ''}`} onClick={filled && !done ? undo : undefined}>{ch}</span>;
            })}
          </Fragment>
        ))}
        {post}
      </div>
    );
  } else {
    const shown = readOnly ? b.answer : (result?.answer as boolean | undefined);
    line = (
      <div class="line">
        {b.prompt}
        {shown !== undefined && (
          <span class="ox"><span class={`blank filled${result && !result.correct ? ' faint' : ''}`}>{shown ? 'O' : 'X'}</span></span>
        )}
      </div>
    );
  }

  const tap = (k: number) => {
    if (done || b.type !== 'initial' || picked.includes(k)) return;
    const next = [...picked, k];
    setPicked(next);
    if (next.length === b.answer.replace(/\s/g, '').length) answer(next.map((i) => b.keys[i]));
  };

  // 판정 뒤 쪽지: 오답 교정 문구, 그 뒤 afterNote(편지 마음에 따라) 한 줄
  const fix = result && !result.correct ? (b.type === 'ox' ? b.fix : b.prompt.replace('___', b.answer)) : '';
  const after = result && b.afterNote ? (moods.some((m) => m === 'kin' || m === 'return') ? b.afterNote.withLetter : b.afterNote.plain) : '';
  const note = [fix, after].filter(Boolean).join(' ');

  return (
    <>
      <Nameplate left={42} top={50} width={260} text={where(scene)} />
      <div class="back abs" style={{ left: 162, top: 100, width: 700, height: 460 }}>
        <div class="abs" style={{ left: 30, top: 40, width: 470 }}>{line}</div>
        {result && (
          <img class="stamp" src={UI[result.correct ? 'stamp-ok' : 'stamp-wrong']} alt={result.correct ? '정답 ✓' : '오답 ✗'} style={{ right: -120, bottom: -4 }} />
        )}
      </div>
      {!done && b.type === 'initial' && (
        <div class="keys abs" style={{ left: 250, top: 590 }}>
          {b.keys.map((k, i) => (
            <button key={i} type="button" class={`key${picked.includes(i) ? ' used' : ''}`} disabled={picked.includes(i)} onClick={() => tap(i)}>
              <span>{k}</span>
            </button>
          ))}
        </div>
      )}
      {!done && b.type === 'ox' && (
        <>
          <Wide label="O" left={250} top={590} onClick={() => answer(true)} />
          <Wide label="X" left={430} top={590} onClick={() => answer(false)} />
        </>
      )}
      {note && <Note left={42} top={500} width={540} portrait={UI['portrait-grandma']} alt="할머니" text={note} />}
      {done && <Wide label={nextLabel} left={800} top={590} onClick={onNext} />}
    </>
  );
}
