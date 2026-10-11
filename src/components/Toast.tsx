// S4 토스트: 봉인 + 이름표 한 줄, 1.5초 뒤 onDone. 포인터 통과(조작 안 막음).
import { useEffect } from 'preact/hooks';
import { UI } from './Kit';

export function Toast({ text = '저장했어요', onDone }: { text?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div class="toast" role="status">
      <img src={UI.seal} alt="" />
      <div class="nameplate"><span>{text}</span></div>
    </div>
  );
}
