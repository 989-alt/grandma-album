// S0 타이틀. 배경 그림(key-title)은 T07 — 지금은 속지 패널.
import { Btn } from '../components/Kit';

export function Title({ onOpen }: { onOpen: () => void }) {
  return (
    <div class="screen panel"><div class="inner">
      <h1 class="title abs" style={{ left: 0, right: 0, top: 260 }}>할머니의 사진첩</h1>
      <Btn kind="amber" label="사진첩 열기" left={392} top={440} width={240} onClick={onOpen} />
    </div></div>
  );
}
