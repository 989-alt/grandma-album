// S0 타이틀: 가죽 패널 안 키아트(사진 틀, 그림 4:3) 중앙 위 → 이름표 제목 → "사진첩 열기". 글과 그림은 겹치지 않는다.
import { Btn } from '../components/Kit';
import { PHOTOS } from '../assets';

export function Title({ onOpen }: { onOpen: () => void }) {
  return (
    <div class="screen panel"><div class="inner">
      {/* 틀 590×470 − 테두리 55×2 = 그림 480×360(4:3) */}
      {/* 그림(3:2)은 4:3 틀에 세로가 꼭 맞아 object-position 만으론 아래 밝은 여백이 안 잘린다 → 1.2배 확대, 등잔·사진첩이 남게 기준점 35% 25% */}
      <div class="frame abs" style={{ left: 217, top: 44, width: 590, height: 470, overflow: 'hidden' }}>
        {PHOTOS['key-title'] && <img src={PHOTOS['key-title']} alt="등잔 아래 펼친 사진첩" style={{ transform: 'scale(1.2)', transformOrigin: '35% 25%' }} />}
      </div>
      <h1 class="nameplate abs" style={{ margin: 0, left: 332, top: 536, width: 360 }}>
        <span style={{ font: '700 30px/1 var(--font-display)' }}>할머니의 사진첩</span>
      </h1>
      <Btn kind="indigo" label="사진첩 열기" left={392} top={620} width={240} onClick={onOpen} />
    </div></div>
  );
}
