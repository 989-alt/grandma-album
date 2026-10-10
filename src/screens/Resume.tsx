// S1 이어하기 — 저장이 있을 때만. 버튼은 임시 <button> — T04 가 킷으로 교체.
const btn = { minHeight: 'var(--size-tap-min)', fontFamily: 'var(--font-display)', fontSize: 'var(--size-xl)' };

export function Resume({ chapter, era, onResume, onRestart }: { chapter: number; era: string; onResume: () => void; onRestart: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--size-lg)' }}>
      <button type="button" onClick={onResume} style={btn}>이어하기({chapter}장{era && ` · ${era}`})</button>
      <button type="button" onClick={onRestart} style={btn}>처음부터</button>
    </div>
  );
}
