import { render } from 'preact';
import { useRef, useState } from 'preact/hooks';
import './styles/tokens.css';
import './styles/kit.css';
import { clear, load, save } from './storage';
import { CHAPTERS, CLOSING, TERMS } from './content';
import { initialState, nextScene } from './engine';
import type { Chapter, Content, State } from './types';
import { Title } from './screens/Title';
import { Resume } from './screens/Resume';
import { Album } from './screens/Album';
import { Scene, type Phase } from './screens/Scene';
import { Toast } from './components/Toast';

const CONTENT = { chapters: CHAPTERS, terms: TERMS, closing: CLOSING } as unknown as Content;

// 렌더 확인용 디버그 진입: ?screen=scene|back|album&id=3-3 (그 장면 앞까지 진행한 상태). 빌드에선 쓰지 않으면 무해.
type Screen = 'title' | 'resume' | 'album' | 'scene';
function debugEntry(): { screen: Screen; phase?: Phase; state: State } | null {
  const q = new URLSearchParams(location.search);
  const screen = q.get('screen');
  if (screen !== 'scene' && screen !== 'back' && screen !== 'album') return null;
  const [c, s] = (q.get('id') ?? '1-1').split('-').map(Number);
  const st: State = { ...initialState(0), chapter: c, sceneIdx: s - 1 };
  return { screen: screen === 'back' ? 'scene' : screen, phase: screen === 'back' ? 'back' : undefined, state: st };
}

function App() {
  const [{ state: saved, dropped }] = useState(load);
  const [dbg] = useState(debugEntry);
  const [screen, setScreen] = useState<Screen>(dbg?.screen ?? 'title');
  const [game, setGame] = useState<State>(() => dbg?.state ?? saved ?? initialState(Date.now()));
  const [toast, setToast] = useState<string | null>(dropped ? '저장된 사진첩을 열 수 없어 처음부터 시작해요' : null);
  const termViews = useRef<Record<string, number>>({}); // 낱말 주머니 열람 수(T06 이 결과에 쓸 수 있게 둠)

  const chapter = CHAPTERS[game.chapter - 1] as unknown as Chapter;
  const scene = chapter.scenes[game.sceneIdx];

  // 장 시작 = 자동 저장 + 토스트
  const startChapter = (st: State) => { save(st); setGame(st); setToast('저장했어요'); setScreen('album'); };
  const fresh = () => startChapter(initialState(Date.now()));

  const sceneDone = (st: State) => {
    // TODO(T06): 장면 뒤 분기 — scene.compare → Compare, scene.letter → Letter, scene.bundle → Bundle(T05 화면)을 여기서 끼운다.
    const n = nextScene(CONTENT, st);
    if (n.type === 'end') { setGame(n.state); setScreen('album'); return; } // TODO(T06): Closing → Result
    if (n.type === 'chapter') { startChapter(n.state); return; } // TODO(T06): 지난 장 retryAt 재출제 → outro 쪽지 → 새 장
    setGame(n.state);
    setScreen('album');
  };

  return (
    <div class="stage" style={{ position: 'relative', width: 'var(--size-stage-w)', height: 'var(--size-stage-h)', margin: '0 auto', overflow: 'hidden' }}>
      {screen === 'title' && <Title onOpen={() => (saved ? setScreen('resume') : fresh())} />}
      {screen === 'resume' && saved && (
        <Resume chapter={saved.chapter} era={CHAPTERS[saved.chapter - 1]?.era ?? ''} onResume={() => { setGame(saved); setScreen('album'); }} onRestart={() => { clear(); fresh(); }} />
      )}
      {screen === 'album' && (
        <Album state={game} onOpen={() => setScreen('scene')} onTerm={(w) => { termViews.current[w] = (termViews.current[w] ?? 0) + 1; }} />
      )}
      {screen === 'scene' && (
        <Scene key={scene.id} chapter={chapter} scene={scene} state={game} phase={dbg?.state === game ? dbg.phase : undefined} onAlbum={() => setScreen('album')} onDone={sceneDone} />
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
