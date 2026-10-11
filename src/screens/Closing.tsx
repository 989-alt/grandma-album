// 닫는 장면(항상, 에필로그 없음): 할머니가 사진첩을 덮으며 쪽지 2줄(CLOSING[closingKey]). 탭 → 결과(뒤표지).
import { Btn, Note, UI } from '../components/Kit';

export function Closing({ lines, onDone }: { lines: readonly [string, string]; onDone: () => void }) {
  return (
    <div class="screen panel" data-screen="closing"><div class="inner">
      <div style={{ whiteSpace: 'pre-line' }}>
        <Note left={92} top={160} width={840} portrait={UI['portrait-grandma']} alt="할머니" text={lines.join('\n')} onClick={onDone} />
      </div>
      <Btn kind="amber" label="다음" left={870} top={650} onClick={onDone} />
    </div></div>
  );
}
