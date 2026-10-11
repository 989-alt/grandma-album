// S1 이어하기 — 저장이 있을 때만.
import { Btn } from '../components/Kit';

export function Resume({ chapter, era, onResume, onRestart }: { chapter: number; era: string; onResume: () => void; onRestart: () => void }) {
  return (
    <div class="screen panel"><div class="inner">
      <Btn kind="amber" label={`이어하기(${chapter}장${era && ` · ${era}`})`} left={272} top={280} width={480} onClick={onResume} />
      <Btn kind="paper" label="처음부터" left={392} top={400} width={240} onClick={onRestart} />
    </div></div>
  );
}
