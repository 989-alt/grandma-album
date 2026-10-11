// 상태 공간 전수 탐색(PRD §6-1·6). 실행: npx tsx scripts/walk.ts — 위반이 있으면 사유를 찍고 exit 1.
import { CHAPTERS, CLOSING, TERMS } from '../src/content/index';
import { walk } from '../src/engine/walk';

const r = walk({ chapters: CHAPTERS, terms: TERMS, closing: CLOSING });
const fail = [...r.errors];
if (r.scenes !== 30) fail.push(`도달 장면 ${r.scenes} ≠ 30`);
if (r.backs !== 30) fail.push(`뒷면 문항 ${r.backs} ≠ 30`);
if (r.deadEnds.length) fail.push(`데드엔드 ${r.deadEnds.length}: ${r.deadEnds.slice(0, 5).join(' / ')}`);
if (r.multiLock.length) fail.push(`잠김 2개 이상 장면: ${r.multiLock.join(', ')}`);
if (r.lossRatio > 0.5) fail.push(`상실 결말 비율 ${r.lossRatio} > 0.5`);

console.log(`도달 장면 ${r.scenes}/30`);
console.log(`뒷면 문항 ${r.backs}/30`);
console.log(`데드엔드 ${r.deadEnds.length}`);
console.log(`잠김 2개 이상 장면 ${r.multiLock.length}`);
console.log(`결말 상태 ${r.endStates}, 경로(선택×보따리) ${r.paths}`);
console.log(`상실 결말(빈 액자≥2) ${r.lossPaths}/${r.paths} = ${(r.lossRatio * 100).toFixed(2)}% (상한 50%)`);
console.log(`상태 해시 ${r.hash}`);
if (fail.length) {
  for (const f of fail) console.error(`위반: ${f}`);
  process.exit(1);
}
console.log('walk 통과');
