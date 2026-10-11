// S3' 두 사진 비교(배치 B 두 쪽). 왼쪽 before, 오른쪽 after 를 탭해 다른 곳 찾기.
// 맞힘 = 그 자리에 stamp-ring 56 + 라벨, 틀림 = 잔물결만(패널티 없음). 1곳 이상 찾으면 '그만 보기', 다 찾으면 자동 진행.
// 키보드: 스팟마다 투명 버튼(aria-label = 라벨)을 after 위에 겹쳐 Tab·Enter 로도 찾는다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { compareHit } from '../engine';
import type { Chapter, Scene, State } from '../types';
import { Strip } from '../components/Hud';
import { Nameplate } from '../components/Kit';
import { Graph } from '../components/compare/Graph';
import stampRing from '../../assets/build/kit/stamp-ring.webp';
import stampOk from '../../assets/build/kit/stamp-ok.webp';
import '../styles/compare.css';

const AUTO_MS = 900;

export function Compare({ chapter, state, scene, srcA, srcB, onChange, onDone }: {
  chapter: Chapter; state: State; scene: Scene; srcA?: string; srcB?: string; onChange: (s: State) => void; onDone: () => void;
}) {
  const spots = scene.compare?.spots ?? [];
  const graph = scene.compare?.graph;
  const [found, setFound] = useState<number[]>([]);
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null);
  // 연타가 부모 재렌더보다 빠를 수 있어 최신 found·state 를 ref 로 들고 간다
  const foundRef = useRef<number[]>([]);
  const cur = useRef(state);
  const doneRef = useRef(false);
  const rippleK = useRef(0);
  const seen = useRef(state);
  if (seen.current !== state) { seen.current = state; cur.current = state; }
  const all = spots.length > 0 && found.length === spots.length;

  useEffect(() => {
    if (!all) return;
    const t = setTimeout(finish, AUTO_MS);
    return () => clearTimeout(t);
  }, [all]);

  // 자동 진행 대기 중 '그만 보기'를 눌러도 onDone 은 한 번만
  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };

  const tap = (e: MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hit((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const hit = (x: number, y: number) => {
    if (foundRef.current.length === spots.length) return;
    const res = compareHit(cur.current, scene, x, y, foundRef.current);
    if (!res.hit) { setRipple({ x, y, k: ++rippleK.current }); return; }
    foundRef.current = [...foundRef.current, res.spotIdx];
    cur.current = res.state;
    setFound(foundRef.current);
    onChange(res.state);
  };

  // 그림을 자르지 않는다(contain): .fit 을 그림 비율로 틀 안에 맞추고, 스팟 좌표(그림 기준 0~1)·탭 판정을 .fit 기준으로.
  // q = 그림 비율 / 틀 비율. 그래프·로드 전에는 틀 전체.
  const [fitA, setFitA] = useState(0);
  const [fitB, setFitB] = useState(0);
  const fit = (set: (q: number) => void) => (e: Event) => {
    const img = e.currentTarget as HTMLImageElement;
    const box = img.closest('.pic')!.getBoundingClientRect();
    set((img.naturalWidth / img.naturalHeight) / (box.width / box.height));
  };
  const fitStyle = (q: number) => ({ width: `${q && q < 1 ? q * 100 : 100}%`, height: `${q > 1 ? 100 / q : 100}%` });

  const pct = (v: number) => `${v * 100}%`;
  return (
    <div class="gx screen-compare">
      <div class="page panel" style={{ left: '8px' }} />
      <div class="page panel" style={{ left: '516px' }} />
      <Strip chapter={chapter} state={state} left={42} top={68} width={432} />
      <Nameplate left={606} top={96} width={320} text={scene.compare?.title ?? ''} />
      <div class="frame abs" style={{ left: '42px', top: '184px', width: '432px', height: '325px' }}>
        <div class="pic"><div class="fit" style={fitStyle(fitA)}>{graph ? <Graph graph={graph} upto={1} /> : srcA && <img src={srcA} alt="" onLoad={fit(setFitA)} />}</div></div>
      </div>
      <div class="frame abs" style={{ left: '550px', top: '184px', width: '432px', height: '325px' }}>
        <div class="pic"><div class="fit" style={fitStyle(fitB)} data-testid="after" onClick={tap}>
          {graph ? <Graph graph={graph} upto={graph.years.length} /> : srcB && <img src={srcB} alt="" onLoad={fit(setFitB)} />}
          {spots.map((p, i) => (
            <button key={`k${i}`} type="button" class="spot-key" aria-label={p.label} aria-pressed={found.includes(i)}
              style={{ left: pct(p.x), top: pct(p.y) }}
              onClick={(e) => { e.stopPropagation(); if (!foundRef.current.includes(i)) hit(p.x, p.y); }} />
          ))}
          {found.map((i) => (
            <div key={i}>
              <img class="mark" src={stampRing} alt="" style={{ left: pct(spots[i].x), top: pct(spots[i].y) }} />
              <span class="spot-label" style={{ left: pct(spots[i].x), top: pct(spots[i].y) }}>{spots[i].label}</span>
            </div>
          ))}
          {ripple && (
            <span key={ripple.k} class="ripple" style={{ left: pct(ripple.x), top: pct(ripple.y) }} onAnimationEnd={() => setRipple(null)} />
          )}
        </div></div>
      </div>
      <div class="cap abs" style={{ left: '60px', top: '520px' }}>{scene.compare?.captionA}</div>
      <div class="cap abs" style={{ left: '568px', top: '520px' }}>{scene.compare?.captionB}</div>
      <Nameplate left={158} top={560} text={`${chapter.id}장 · ${chapter.era}`} />
      {spots.map((_, i) => (
        <img key={i} class={i < found.length ? 'mark abs found' : 'mark faint abs'} src={i < found.length ? stampOk : stampRing} alt=""
          style={{ left: `${550 + 64 * i}px`, top: '560px' }} />
      ))}
      <button type="button" class="key wide abs" style={{ left: '822px', top: '556px' }} disabled={found.length === 0} onClick={finish}>
        <span>그만 보기</span>
      </button>
    </div>
  );
}
