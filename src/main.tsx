import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles/tokens.css';
import { clear, dropped, load } from './storage';
import { Title } from './screens/Title';
import { Resume } from './screens/Resume';

// 화면 하나만 그리는 최소 라우터. album 이후 화면은 T04/T06 이 붙인다.
type Screen = 'title' | 'resume' | 'album';

function App() {
  const [saved] = useState(load);
  const [toast, setToast] = useState(dropped);
  const [screen, setScreen] = useState<Screen>('title');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div style={{ position: 'relative', width: 'var(--size-stage-w)', height: 'var(--size-stage-h)', margin: '0 auto', overflow: 'hidden' }}>
      {screen === 'title' && <Title onOpen={() => setScreen(saved ? 'resume' : 'album')} />}
      {screen === 'resume' && saved && (
        // era 는 T02 CONTENT 가 생기면 T04 가 chapters[...].era 로 채운다
        <Resume chapter={saved.chapter} era="" onResume={() => setScreen('album')} onRestart={() => { clear(); setScreen('album'); }} />
      )}
      {toast && (
        <div role="status" style={{ position: 'absolute', left: 0, right: 0, bottom: 'var(--size-2xl)', textAlign: 'center', fontSize: 'var(--size-base)' }}>
          저장된 사진첩을 열 수 없어 처음부터 시작해요
        </div>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
