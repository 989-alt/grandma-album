// 2-4 소작(빌린 땅) 비율 그래프. 그림 대신 DOM 막대: 왼쪽 묶음 = 자기 땅(100−소작), 오른쪽 묶음 = 빌린 땅(소작).
// upto = 보일 해 수(before 는 첫 해만, after 는 전부). 묶음 중심 x 0.25·0.75 = 콘텐츠 spots 좌표.
type G = { years: number[]; tenant: number[] };

export function Graph({ graph, upto }: { graph: G; upto: number }) {
  const ys = graph.years.slice(0, upto);
  const group = (cls: string, title: string, val: (i: number) => number) => (
    <div class={`grp ${cls}`}>
      <b>{title}</b>
      <div class="bars">
        {ys.map((y, i) => (
          <div class="bar" key={y}>
            <i style={{ height: `${val(i) * 0.7}%` }} />
            <span>{y}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div class="graph">
      {group('own', '자기 땅', (i) => 100 - graph.tenant[i])}
      {group('tenant', '빌린 땅', (i) => graph.tenant[i])}
    </div>
  );
}
