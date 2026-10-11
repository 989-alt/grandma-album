import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import './styles/tokens.css';
import './styles/kit.css';
import { clear, load, save } from './storage';
import { ALL_SCENES, CHAPTERS, CLOSING, TERMS } from './content';
import { answerBack, initialState, nextScene, retryAt, summarize } from './engine';
import type { Chapter, Content, Scene as SceneT, State } from './types';
import { Title } from './screens/Title';
import { Resume } from './screens/Resume';
import { Album } from './screens/Album';
import { Scene, type Phase } from './screens/Scene';
import { Compare } from './screens/Compare';
import { Letter } from './screens/Letter';
import { Bundle } from './screens/Bundle';
import { Closing } from './screens/Closing';
import { Result } from './screens/Result';
import { Toast } from './components/Toast';
import { PhotoBack } from './components/PhotoBack';
import { Btn, Note, UI } from './components/Kit';
import { SFX_CAPTIONS, photo } from './assets';
import { Bgm, pickBgm } from './audio';

const CONTENT = { chapters: CHAPTERS, terms: TERMS, closing: CLOSING } as unknown as Content;
const sceneById = (id: string) => ALL_SCENES.find((s) => s.id === id) as unknown as SceneT;

const bgm = new Bgm();
type Sfx = (typeof SFX_CAPTIONS)[number]['id'];

type Screen = 'title' | 'resume' | 'album' | 'scene' | 'bundle' | 'compare' | 'letter' | 'retry' | 'outro' | 'closing' | 'result';
/** 장 끝에서 다음 장(또는 끝)으로 넘어가기 전 들고 있는 것: 넘어갈 state, 재출제 문항, 지난 장 outro. */
type Pending = { end: boolean; state: State; retry: string | null; outro?: string };

// 렌더 확인용 디버그 진입: ?screen=scene|back|album&id=3-3 (그 장면 앞까지 진행한 상태), ?screen=result[&perfect=1].
function debugEntry(): { screen: Screen; phase?: Phase; state: State } | null {
  const q = new URLSearchParams(location.search);
  const screen = q.get('screen');
  if (screen === 'result') {
    const perfect = q.get('perfect') === '1';
    const answers = ALL_SCENES.map((s) => ({ sceneId: s.id, correct: perfect || (s.id !== '1-2' && s.id !== '1-4'), retried: false }));
    const st: State = {
      ...initialState(0), chapter: 6, sceneIdx: 1, answers, bundle: ['bundle', 'book', 'spoon'], playMs: 32 * 60_000,
      flags: { spoon: true, spoon_hidden: true, first_color: true },
      family: { father: 'apart', mother: 'with', brother: 'with', okbun: 'with', little: 'with' },
    };
    return { screen: 'result', state: st };
  }
  if (screen !== 'scene' && screen !== 'back' && screen !== 'album') return null;
  const [c, s] = (q.get('id') ?? '1-1').split('-').map(Number);
  const st: State = { ...initialState(0), chapter: c, sceneIdx: s - 1 };
  return { screen: screen === 'back' ? 'scene' : screen, phase: screen === 'back' ? 'back' : undefined, state: st };
}

function App() {
  const [boot] = useState(load);
  const [saved, setSaved] = useState(boot.state);
  const [dbg] = useState(debugEntry);
  const [screen, setScreen] = useState<Screen>(dbg?.screen ?? 'title');
  const [game, setGame] = useState<State>(() => dbg?.state ?? saved ?? initialState(Date.now()));
  const [phase, setPhase] = useState<Phase | undefined>(dbg?.phase);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<{ text: string; k: number } | null>(
    boot.dropped ? { text: '저장된 사진첩을 열 수 없어 처음부터 시작해요', k: 0 } : null,
  );
  const termViews = useRef<Record<string, number>>({}); // 낱말 주머니 열람 수(결과엔 쓰지 않음 — 7항에 없다)
  const since = useRef(Date.now()); // 플레이 시간: 마지막으로 playMs 에 더한 시각
  const g = useRef(game);
  g.current = game;
  const [cap, setCap] = useState<{ text: string; k: number } | null>(null); // 효과음 자막(소리 없음) 1줄, 0.9초
  const bgmId = screen === 'title' ? null : pickBgm(game.chapter);
  (window as unknown as { __album?: State & { bgm: string | null } }).__album = { ...game, bgm: bgmId }; // e2e 가 읽는 디버그 노출(state + 곡 id)
  useEffect(() => bgm.set(bgmId), [bgmId]);
  useEffect(() => {
    if (!cap) return;
    const t = setTimeout(() => setCap(null), 900);
    return () => clearTimeout(t);
  }, [cap?.k]);

  const chapter = CHAPTERS[game.chapter - 1] as unknown as Chapter;
  const scene = chapter.scenes[game.sceneIdx];

  const say = (text: string) => setToast((t) => ({ text, k: (t?.k ?? 0) + 1 }));
  const sfx = (id: Sfx) => setCap((c) => ({ text: SFX_CAPTIONS.find((x) => x.id === id)!.caption, k: (c?.k ?? 0) + 1 }));
  const tick = (st: State): State => {
    const now = Date.now();
    const ms = now - since.current;
    since.current = now;
    return { ...st, playMs: st.playMs + ms };
  };

  // 장 시작 = 자동 저장 + 토스트
  const startChapter = (st: State) => { save(st); setSaved(st); setGame(st); say('저장했어요'); sfx('save'); setScreen('album'); };
  const fresh = () => { since.current = Date.now(); startChapter(initialState(Date.now())); };

  const openScene = () => {
    if (scene.bundle) { setScreen('bundle'); return; } // 보따리(5-1)는 고른 뒤 인화(1.2초) → 뒷면
    setPhase(undefined);
    setScreen('scene');
  };

  // 장면(뒷면까지) 뒤 = 비교 → 편지 → 다음 장면
  const sceneDone = (st: State) => {
    const t = tick(st);
    setGame(t);
    if (scene.compare) setScreen('compare');
    else if (scene.letter) setScreen('letter');
    else advance(t);
  };

  const advance = (st: State) => {
    const n = nextScene(CONTENT, st);
    if (n.type === 'scene') { setGame(n.state); setScreen('album'); return; }
    // 장 끝: 지난 장 재출제 1개 → outro 쪽지 → 새 장(저장) 또는 닫는 장면
    const r = retryAt(n.state, chapter.id);
    const p: Pending = { end: n.type === 'end', state: r?.state ?? n.state, retry: r?.sceneId ?? null, outro: chapter.outro };
    setPending(p);
    if (p.retry) setScreen('retry');
    else afterRetry(p);
  };

  const afterRetry = (p: Pending) => {
    if (p.outro && !p.end) setScreen('outro');
    else finish(p);
  };

  const finish = (p: Pending) => {
    setPending(null);
    if (p.end) { setGame(tick(p.state)); setScreen('closing'); return; }
    startChapter(p.state);
  };

  const toTitle = () => { setSaved(load().state); setScreen('title'); };
  const replay = () => { clear(); setSaved(null); setGame(initialState(Date.now())); setScreen('title'); };

  return (
    <div class="stage" style={{ position: 'relative', width: 'var(--size-stage-w)', height: 'var(--size-stage-h)', margin: '0 auto', overflow: 'hidden' }}>
      {screen === 'title' && <Title onOpen={() => (saved ? setScreen('resume') : fresh())} />}
      {screen === 'resume' && saved && (
        <Resume chapter={saved.chapter} era={CHAPTERS[saved.chapter - 1]?.era ?? ''}
          onResume={() => { since.current = Date.now(); setGame(saved); setScreen('album'); }}
          onRestart={() => { clear(); fresh(); }} />
      )}
      {screen === 'album' && (
        <Album photoSrc={(id) => photo(sceneById(id).photoAsset)} state={game} onOpen={openScene} onTerm={(w) => { termViews.current[w] = (termViews.current[w] ?? 0) + 1; }} />
      )}
      {screen === 'scene' && (
        <Scene photoSrc={photo(scene.photoAsset)} key={scene.id} chapter={chapter} scene={scene} state={game} phase={phase} onAlbum={() => setScreen('album')} onDone={sceneDone} />
      )}
      {screen === 'bundle' && (
        <Bundle state={game} scene={scene} onChange={setGame} onDone={() => { setPhase('print'); sfx('print'); setScreen('scene'); }} />
      )}
      {screen === 'compare' && (
        <Compare srcA={photo(scene.compare?.a)} srcB={photo(scene.compare?.b)} key={scene.id} state={game} scene={scene} onChange={(st) => { setGame(st); sfx('found'); }} onDone={() => advance(g.current)} />
      )}
      {screen === 'letter' && (
        <Letter scene={scene} onDone={(moods) => { const st = { ...g.current, letterMoods: moods }; setGame(st); advance(st); }} />
      )}
      {screen === 'retry' && pending?.retry && (
        <div class="screen panel" data-screen="retry"><div class="inner">
          <PhotoBack key={pending.retry} scene={sceneById(pending.retry)}
            judge={(a) => { const ok = answerBack(pending.state, sceneById(pending.retry!), a).correct; sfx(ok ? 'correct' : 'wrong'); return ok; }} onNext={() => afterRetry(pending)} />
        </div></div>
      )}
      {screen === 'outro' && pending?.outro && (
        <div class="screen panel" data-screen="outro"><div class="inner">
          <Note left={242} top={220} width={540} portrait={UI['portrait-grandma']} alt="할머니" text={pending.outro} onClick={() => finish(pending)} />
          <Btn kind="amber" label="다음" left={870} top={650} onClick={() => finish(pending)} />
        </div></div>
      )}
      {screen === 'closing' && <Closing lines={CLOSING.variants[summarize(CONTENT, game).closingKey]} onDone={() => setScreen('result')} />}
      {screen === 'result' && <Result content={CONTENT} state={game} onReplay={replay} onTitle={toTitle} />}
      {cap && (
        <div key={cap.k} class="toast sfx" role="status" data-testid="sfx"><div class="nameplate"><span>{cap.text}</span></div></div>
      )}
      {toast && <Toast key={toast.k} text={toast.text} onDone={() => setToast(null)} />}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
