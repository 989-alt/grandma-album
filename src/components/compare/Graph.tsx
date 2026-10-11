// 2-4 빌린 땅에서 농사짓는 농민 비율(교과서 p.126) — 그림 대신 DOM 막대, 단일 계열.
// 칸은 해마다 고정, upto = 막대를 그릴 해 수(before 는 첫 해만, after 는 전부). 라벨은 콘텐츠 years 뿐.
type G = { years: number[]; tenant: number[] };

export function Graph({ graph, upto }: { graph: G; upto: number }) {
  return (
    <div class="graph">
      {graph.years.map((y, i) => (
        <div class="bar" key={y}>
          {i < upto && <i style={{ height: `${graph.tenant[i] * 1.4}%` }} />}
          <span>{y}</span>
        </div>
      ))}
    </div>
  );
}
