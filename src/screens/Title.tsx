// S0 타이틀. 버튼은 임시 <button> — T04 가 킷으로 교체.
export function Title({ onOpen }: { onOpen: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--size-2xl)' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--size-3xl)', color: 'var(--surface-album-foreground)' }}>할머니의 사진첩</h1>
      <button type="button" onClick={onOpen} style={{ minHeight: 'var(--size-tap-min)', fontFamily: 'var(--font-display)', fontSize: 'var(--size-xl)' }}>사진첩 열기</button>
    </div>
  );
}
