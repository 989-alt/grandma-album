// S3 장면. 순서: 내레이션 쪽지(할머니) → 대사(주인공) → 선택 카드 → 변화(게이지·초상) → 인화(1.2초) → 사진 뒷면 → 판정.
// 카드가 있으면 배치 A, 없으면 배치 C 몸통. 뒷면은 배치 C 뒷면(HUD 없음).
// 장면 그림은 photoSrc(T07 연결 전엔 빈 사진 틀).
import { useEffect, useState } from 'preact/hooks';
import { answerBack, applyChoice, enterScene, visibleChoices } from '../engine';
import type { Chapter, Scene as SceneT, State } from '../types';
import { Choices } from '../components/Choices';
import { Hud } from '../components/Hud';
import { Btn, IMG, Note, UI } from '../components/Kit';
import { PhotoBack } from '../components/PhotoBack';

export type Phase = 'talk' | 'choose' | 'change' | 'print' | 'back';
type Page = { text: string; who: 'grandma' | 'hero' };
type Mood = 'calm' | 'happy' | 'worried';

// 쪽지 한 장에 다섯 줄(24px·폭 ~290px ≈ 줄당 12자)까지 → 문장 단위로 나눠 50자 안팎씩 묶는다.
const MAX = 50;
function pages(scene: SceneT): Page[] {
  const parts = scene.narration.replace(/([.!?])\s+/g, '$1\n').split('\n').flatMap((s) => {
    if (s.length <= MAX + 10) return [s];
    const cut = s.indexOf(', ', s.length / 3);
    return cut < 0 ? [s] : [s.slice(0, cut + 1), s.slice(cut + 2)];
  });
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].length + p.length < MAX) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return [...out.map((text) => ({ text, who: 'grandma' as const })), ...scene.dialogue.map((text) => ({ text, who: 'hero' as const }))];
}

export function Scene({ chapter, scene, state, photoSrc, phase: start = 'talk', onAlbum, onDone, onChoose = () => {}, onPrint = () => {}, onJudge = () => {} }: {
  chapter: Chapter; scene: SceneT; state: State; photoSrc?: string; phase?: Phase; onAlbum: () => void; onDone: (state: State) => void;
  /** 효과음 자막용(T08): 카드 탭 직후 · 인화 시작 · 뒷면 판정 직후 */
  onChoose?: () => void; onPrint?: () => void; onJudge?: (correct: boolean) => void;
}) {
  const [entered] = useState(() => enterScene(state, scene));
  const [st, setSt] = useState(entered);
  const [phase, setPhase] = useState<Phase>(start);
  const [p, setP] = useState(0);
  const [mood, setMood] = useState<Mood>('calm');
  const ps = pages(scene);
  const hasCards = visibleChoices(entered, scene).length > 0;

  useEffect(() => { if (phase === 'print') onPrint(); }, [phase]);
  useEffect(() => {
    if (phase !== 'change' && phase !== 'print') return;
    const t = setTimeout(() => setPhase(phase === 'change' ? 'print' : 'back'), phase === 'change' ? 1000 : 1200);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'back') {
    return (
      <div class="screen panel"><div class="inner">
        <PhotoBack scene={scene} judge={(a) => { const r = answerBack(st, scene, a); setSt(r.state); onJudge(r.correct); return r.correct; }} onNext={() => onDone(st)} />
      </div></div>
    );
  }

  const next = () => {
    if (phase !== 'talk') return;
    if (p + 1 < ps.length) setP(p + 1);
    else setPhase(hasCards ? 'choose' : 'print');
  };
  const choose = (idx: number) => {
    const r = applyChoice(st, scene, idx);
    if (!r.ok) return;
    const c = scene.choices![idx];
    const sum = c.effects.family + c.effects.home + c.effects.third;
    setMood(sum < 0 || (c.setFamily && c.setFamily.status !== 'with') ? 'worried' : sum > 0 ? 'happy' : 'calm');
    setSt(r.state);
    onChoose();
    setPhase('change');
  };

  const page = ps[Math.min(p, ps.length - 1)];
  const hero = page.who === 'hero' || phase === 'change';
  const note = {
    portrait: hero ? IMG[`${chapter.protagonist}-${mood}`] : UI['portrait-grandma'],
    alt: hero ? '나' : '할머니',
    text: page.text,
    onClick: next,
  };
  const frameCls = `frame abs${phase === 'print' ? ' printing' : ''}`;
  const photo = photoSrc ? <img src={photoSrc} alt="" /> : null;

  return (
    <div class="screen panel"><div class="inner">
      <Hud chapter={chapter} state={st} onAlbum={onAlbum} />
      {hasCards ? (
        <>
          <div class={frameCls} style={{ left: 42, top: 158, width: 480, height: 320 }}>{photo}</div>
          <Note left={42} top={500} width={540} {...note} />
          {phase !== 'talk' && <Choices chapter={chapter} scene={scene} state={entered} onChoose={choose} />}
        </>
      ) : (
        <>
          <div class={frameCls} style={{ left: 42, top: 162, width: 420, height: 280 }}>{photo}</div>
          <Note left={478} top={162} width={512} {...note} />
        </>
      )}
      {phase === 'talk' && <Btn kind="amber" label="다음" left={870} top={650} onClick={next} />}
    </div></div>
  );
}
