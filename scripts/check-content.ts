// CONTENT 검사(PRD §6-2·6-3). 실행: npx tsx scripts/check-content.ts — 위반이 있으면 사유를 찍고 exit 1.
import { readdirSync, readFileSync } from 'node:fs';
import { CHAPTERS, TERMS, CLOSING, ALL_SCENES } from '../src/content/index';

const FORBIDDEN = ['전쟁이 끝났', '창씨개명', '공출', '종군 위안부', '흥선대원군', '징용'];
const fail: string[] = [];

// CONTENT 값 + src/content 원본 파일 글자 전부(주석 포함)
const dir = new URL('../src/content/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const texts: [string, string][] = [
  ['CONTENT', JSON.stringify({ CHAPTERS, TERMS, CLOSING })],
  ...files.map((f): [string, string] => [f, readFileSync(new URL(f, dir), 'utf8')]),
];

for (const [name, t] of texts) {
  for (const w of FORBIDDEN) if (t.includes(w)) fail.push(`금지 문구 "${w}" — ${name}`);
  if (/일본군 위안부|종군/.test(t)) fail.push(`'위안부' 따옴표 없음 또는 '종군' — ${name}`);
  const bare = t.replace(/일본군 '위안부'/g, '').match(/위안부/g);
  if (bare) fail.push(`일본군 '위안부' 형태가 아닌 '위안부' ${bare.length}회 — ${name}`);
}
if (!/일본군 '위안부'/.test(texts[0][1])) fail.push("CONTENT 에 일본군 '위안부' 문장 없음(3-5)");

// 지도 내용 번호: 장면 + 낱말 주머니 합집합 = 1..45, 범위 밖 번호 없음
const tags = [...ALL_SCENES.flatMap((s) => s.source), ...TERMS.flatMap((t) => t.source)];
const bad = tags.filter((n) => !Number.isInteger(n) || n < 1 || n > 45);
if (bad.length) fail.push(`source 범위 밖: ${[...new Set(bad)].join(',')}`);
const missing = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !tags.includes(n));
if (missing.length) fail.push(`source 빠진 번호: ${missing.join(',')}`);

// 장면 수
const per = CHAPTERS.map((c) => c.scenes.length).join('/');
if (ALL_SCENES.length !== 30) fail.push(`장면 수 ${ALL_SCENES.length} ≠ 30`);
if (per !== '5/6/6/4/7/2') fail.push(`장별 장면 수 ${per} ≠ 5/6/6/4/7/2`);
const initial = ALL_SCENES.filter((s) => s.back.type === 'initial').length;
if (initial !== 19 || ALL_SCENES.length - initial !== 11) fail.push(`뒷면 초성 ${initial}·O·X ${ALL_SCENES.length - initial} ≠ 19·11`);

if (fail.length) {
  console.error(`check-content 실패 ${fail.length}건\n- ${fail.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-content 통과: 장면 ${ALL_SCENES.length}(${per}), 뒷면 초성 ${initial}·O·X ${ALL_SCENES.length - initial}, source 1..45 전부, 금지 문구 0, 일본군 '위안부' 표기 OK (검사 ${texts.length}개: ${texts.map((t) => t[0]).join(', ')})`);
