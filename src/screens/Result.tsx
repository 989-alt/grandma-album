// S5 결과 = 사진첩 뒤표지(배치 B 두 쪽). 사진첩을 처음부터 넘김(펼침마다 0.6초 = 장당 0.3초) → 마지막 장 7항
// (플레이 시간·도달 지점·정답률·틀린 문제·가족·물건·말) + 학도병 질문 1줄(답 입력 없음) + 다시하기·타이틀.
// 선택을 평가하는 문구 없음. 틀린 문항 탭 → 그 사진 뒷면(읽기 전용).
import { useEffect, useState } from 'preact/hooks';
import { CHAPTERS } from '../content';
import { summarize } from '../engine';
import type { Chapter, Content, Scene, State } from '../types';
import { members } from '../components/Hud';
import { Btn, IMG, Nameplate, Note, UI } from '../components/Kit';
import { PhotoBack } from '../components/PhotoBack';

const chapters = CHAPTERS as unknown as Chapter[];
const SPREADS = 3;
const FLIP_MS = 600;
const QUESTION = '내가 그때 학생이었다면, 학도병으로 나갔을까?';
const WORDS = {
  kept: '이 놋수저는 내 할아버지 때부터 지금까지 우리 집 밥상에 오른단다.',
  gone: '그 놋수저는 이제 없지만, 이야기는 이 사진첩에 남았단다.',
};

const label = { position: 'absolute', font: '700 20px/1 var(--font-body)', color: 'var(--muted-foreground)' } as const;
const value = { position: 'absolute', font: '28px/1.2 var(--font-display)', color: 'var(--card-foreground)', whiteSpace: 'nowrap' } as const;

export function Result({ content, state, onReplay, onTitle }: { content: Content; state: State; onReplay: () => void; onTitle: () => void }) {
  const [step, setStep] = useState(0);
  const [viewing, setViewing] = useState<Scene | null>(null);
  useEffect(() => {
    if (step >= SPREADS) return;
    const t = setTimeout(() => setStep(step + 1), FLIP_MS);
    return () => clearTimeout(t);
  }, [step]);

  if (viewing) {
    return (
      <div class="screen panel"><div class="inner">
        <PhotoBack scene={viewing} nextLabel="뒤표지" onNext={() => setViewing(null)} />
      </div></div>
    );
  }

  const pages = (
    <>
      <div class="page panel" style={{ left: 8 }} />
      <div class="page panel" style={{ left: 516 }} />
    </>
  );

  if (step < SPREADS) {
    const page = (ci: number, side: 0 | 1) => {
      const ch = chapters[ci];
      const x0 = side ? 550 : 42;
      const y0 = side ? 160 : 250;
      return (
        <>
          <Nameplate left={side ? 666 : 158} top={side ? 96 : 190} text={`${ch.id}장 · ${ch.era}`} />
          {ch.scenes.map((sc, i) => (
            <div key={sc.id} class="frame sm abs" style={{ left: x0 + (i % 3) * 144, top: y0 + Math.floor(i / 3) * 116, width: 130, height: 100 }} />
          ))}
          <img class="abs" src={UI.seal} alt="" style={side ? { left: 896, top: 520, width: 64 } : { left: 388, top: 620, width: 64 }} />
        </>
      );
    };
    return <div class="screen" data-screen="flip">{pages}{page(step * 2, 0)}{page(step * 2 + 1, 1)}</div>;
  }

  const s = summarize(content, state);
  const ch = chapters[s.reached.chapter - 1];
  const right = state.answers.filter((a) => a.correct).length;
  const fam = members(chapters[5]);
  const items = s.items.bundle;
  // 놋수저 칸은 보따리에 없을 때만(중복 없음). 남은 놋수저 = spoon_hidden(summarize items.spoon)
  const spoonApart = s.items.spoon && !items.includes('spoon');

  return (
    <div class="screen" data-screen="result">
      {pages}
      {/* 왼쪽 쪽: 플레이 시간 · 도달 지점 · 정답률 · 틀린 문제 */}
      <Nameplate left={158} top={96} text="뒤표지" />
      <span style={{ ...label, left: 42, top: 186 }}>플레이 시간</span>
      <span data-testid="r-time" style={{ ...value, left: 190, top: 180 }}>{`${Math.max(1, Math.round(s.playMs / 60_000))}분`}</span>
      <span style={{ ...label, left: 42, top: 246 }}>도달 지점</span>
      <span data-testid="r-reached" style={{ ...value, left: 190, top: 240 }}>{`${ch.id}장 · ${ch.era} · ${s.reached.sceneId}`}</span>
      <span style={{ ...label, left: 42, top: 306 }}>정답률</span>
      <span data-testid="r-rate" style={{ ...value, left: 190, top: 300 }}>{`${Math.round(s.correctRate * 100)}% (${right}/${state.answers.length})`}</span>
      <span style={{ ...label, left: 42, top: 366 }}>틀린 문제</span>
      <div data-testid="r-wrong" class="terms abs" style={{ left: 42, top: 400 }}>
        {s.wrong.length === 0
          ? <span style={{ font: '28px/1.2 var(--font-display)' }}>모두 맞았어요</span>
          : s.wrong.map((id) => (
            <button key={id} type="button" class="key wide term" aria-label={`${id} 사진 뒷면 다시 보기`}
              onClick={() => setViewing(content.chapters.flatMap((c) => c.scenes).find((sc) => sc.id === id) ?? null)}>
              <span>{id}</span>
            </button>
          ))}
      </div>

      {/* 오른쪽 쪽: 가족 · 물건 · 말 · 학도병 질문 · 버튼 */}
      <span style={{ ...label, left: 550, top: 76 }}>가족</span>
      <div data-testid="r-family" class="abs" style={{ left: 550, top: 106, display: 'flex', gap: 14 }}>
        {fam.map((m) => (s.family.status[m.id] ?? 'with') === 'with'
          ? <img key={m.id} src={m.src} alt={m.name} data-frame="with" style={{ width: 64, height: 78, objectFit: 'contain' }} />
          : <div key={m.id} class="slot" role="img" aria-label={`${m.name} 빈 액자`} data-frame="empty"
            style={{ width: 64, height: 78, borderWidth: 14, borderImageWidth: '14px' }} />)}
      </div>
      <span style={{ ...label, left: 550, top: 206 }}>물건</span>
      <div data-testid="r-items" class="abs" style={{ left: 550, top: 236, display: 'flex', gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} class="key lg" data-item={items[i] ?? ''}>{items[i] && <img src={IMG[`item-${items[i]}`]} alt={items[i]} />}</div>
        ))}
        {spoonApart && (
          <>
            <img src={UI['icon-bundle']} alt="" style={{ width: 40, alignSelf: 'center' }} />
            <div class="key lg" data-item="spoon"><img src={IMG['item-spoon']} alt="놋수저" /></div>
          </>
        )}
      </div>
      <div data-testid="r-words">
        <Note left={550} top={350} width={432} portrait={UI['portrait-grandma']} alt="할머니" text={s.items.spoon ? WORDS.kept : WORDS.gone} />
      </div>
      <p data-testid="r-question" class="abs" style={{ left: 550, top: 556, width: 432, margin: 0, font: '28px/1.1 var(--font-hand)', color: 'var(--card-foreground)', wordBreak: 'keep-all' }}>
        {QUESTION}
      </p>
      <Btn kind="amber" label="다시하기" left={550} top={650} width={200} onClick={onReplay} />
      <Btn kind="paper" label="타이틀" left={782} top={650} width={200} onClick={onTitle} />
    </div>
  );
}
