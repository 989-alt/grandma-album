import { describe, expect, it } from 'vitest';
import { ALL_SCENES, CHAPTERS, CLOSING, TERMS } from './index';
import PRD from '../../../docs/grandma-album/PRD.md?raw';

const scene = (id: string) => ALL_SCENES.find((s) => s.id === id)!;
const CONTENT_TEXT = JSON.stringify({ CHAPTERS, TERMS, CLOSING });

// 한글 음절 → 초성. 띄어쓰기는 그대로 둔다.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const chosung = (s: string) =>
  [...s].map((c) => {
    const k = c.charCodeAt(0) - 0xac00;
    return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c;
  }).join('');

describe('장면 수', () => {
  it('30장면, 장별 5/6/6/4/7/2, id 1-1…6-2', () => {
    expect(ALL_SCENES).toHaveLength(30);
    expect(CHAPTERS.map((c) => c.scenes.length)).toEqual([5, 6, 6, 4, 7, 2]);
    CHAPTERS.forEach((c, ci) => c.scenes.forEach((s, si) => {
      expect(s.id).toBe(`${ci + 1}-${si + 1}`);
      expect(s.photoAsset).toBe(`scene-${s.id}`);
    }));
  });

  it('장 설정: 주인공·가족·셋째 축', () => {
    expect(CHAPTERS.map((c) => c.protagonist)).toEqual(['manbok', 'suni', 'okbun', 'okbun', 'okbun', 'okbun']);
    expect(CHAPTERS.map((c) => c.thirdAxis)).toEqual(['new', 'language', 'language', 'hope', 'hope', 'hope']);
    expect(CHAPTERS[0].family.map((f) => f.id)).toEqual(['father', 'mother']);
    expect(CHAPTERS[1].family.map((f) => f.id)).toEqual(['father', 'mother', 'uncle']);
    for (const c of CHAPTERS.slice(2)) expect(c.family.map((f) => f.id)).toEqual(['father', 'mother', 'brother', 'okbun', 'little']);
  });
});

describe('PRD 글자 그대로', () => {
  it('내레이션 30개 모두 PRD 따옴표 문장과 일치', () => {
    for (const s of ALL_SCENES) expect(PRD, s.id).toContain(`"${s.narration}"`);
  });
  it('O·X 문장은 PRD 그대로 (5-7 은 관리자 판정 문구)', () => {
    for (const s of ALL_SCENES) {
      if (s.back.type !== 'ox' || s.id === '5-7') continue;
      expect(PRD, s.id).toContain(`O·X "${s.back.prompt}"`);
    }
    expect(scene('5-7').back).toMatchObject({ type: 'ox', prompt: '1953년 7월 정전 협정으로 6·25 전쟁이 완전히 끝났다', answer: false });
  });
  it('초성 hint 는 PRD 그대로', () => {
    for (const s of ALL_SCENES) if (s.back.type === 'initial') expect(PRD, s.id).toContain(`초성 "${s.back.hint}"`);
  });
  it('5-5 편지 발췌 6줄 그대로, mood 3개', () => {
    const l = scene('5-5').letter!;
    for (const line of l.lines) expect(PRD).toContain(`"${line}"`);
    expect(l.lines).toHaveLength(6);
    expect(l.moods).toEqual([
      { id: 'fear', text: '두렵다' },
      { id: 'kin', text: '동족과 싸우는 게 괴롭다' },
      { id: 'return', text: '꼭 살아서 돌아오겠다' },
    ]);
  });
});

describe('뒷면 30문항', () => {
  it('초성 19 · O·X 11', () => {
    expect(ALL_SCENES.filter((s) => s.back.type === 'initial')).toHaveLength(19);
    expect(ALL_SCENES.filter((s) => s.back.type === 'ox')).toHaveLength(11);
  });

  it('초성 문항: answer 의 초성 분해 = hint (띄어쓰기 포함)', () => {
    expect(chosung('대한민국 임시 정부')).toBe('ㄷㅎㅁㄱ ㅇㅅ ㅈㅂ');
    for (const s of ALL_SCENES) if (s.back.type === 'initial') expect(chosung(s.back.answer), s.id).toBe(s.back.hint);
  });

  it('초성 문항: keys 는 글자 단위, 중복 없음, 정답 글자 전부 + 오답 2개 이상', () => {
    for (const s of ALL_SCENES) {
      if (s.back.type !== 'initial') continue;
      const need = [...s.back.answer.replace(/ /g, '')];
      const { keys } = s.back;
      expect(new Set(keys).size, s.id).toBe(keys.length);
      keys.forEach((k) => expect(k, s.id).toMatch(/^[가-힣]$/));
      need.forEach((c) => expect(keys, s.id).toContain(c));
      expect(keys.length, s.id).toBeGreaterThanOrEqual(Math.max(6, new Set(need).size + 2));
      expect(keys.length, s.id).toBeLessThanOrEqual(10);
    }
    expect(scene('3-3').back).toMatchObject({ answer: '신사', hint: 'ㅅㅅ', keys: ['신', '서', '사', '소', '수', '시'] });
  });

  it('초성 문항: prompt 에 빈칸 ___ 한 번, 정답 글자는 없음', () => {
    for (const s of ALL_SCENES) {
      if (s.back.type !== 'initial') continue;
      expect(s.back.prompt.split('___'), s.id).toHaveLength(2);
      expect(s.back.prompt, s.id).not.toContain(s.back.answer);
    }
  });

  it('O·X 문항: answer 는 boolean, fix 한 줄', () => {
    const ox = ALL_SCENES.flatMap((s) => (s.back.type === 'ox' ? [[s.id, s.back] as const] : []));
    for (const [id, b] of ox) {
      expect(typeof b.answer, id).toBe('boolean');
      expect(b.fix.length, id).toBeGreaterThan(0);
    }
    expect(ox.filter(([, b]) => b.answer).map(([id]) => id)).toEqual(['3-1', '5-5']);
  });

  it('뒷면 source = 교과서 쪽수 p.104~152 (5-5 만 지도서 p.327~328)', () => {
    for (const s of ALL_SCENES) {
      const [lo, hi] = s.id === '5-5' ? [327, 328] : [104, 152];
      for (const p of s.back.source) expect(p, s.id).toSatisfy((n: number) => n >= lo && n <= hi);
    }
  });
});

describe('선택·플래그·사건', () => {
  it('effects 는 −1/0/+1, 잠금은 장면당 최대 1개(home ≥ 2)', () => {
    for (const s of ALL_SCENES) {
      for (const c of s.choices ?? []) for (const v of Object.values(c.effects)) expect([-1, 0, 1], s.id).toContain(v);
      const locks = (s.choices ?? []).filter((c) => c.lock);
      expect(locks.length, s.id).toBeLessThanOrEqual(1);
      locks.forEach((c) => expect(c.lock).toEqual({ stat: 'home', min: 2 }));
    }
  });

  it('3-3 이름: 어느 갈래도 가족 상태 변화 없음(setFamily·event 없음, family 0)', () => {
    const s = scene('3-3');
    expect(s.event).toBeUndefined();
    for (const c of s.choices!) {
      expect(c.setFamily).toBeUndefined();
      expect(c.effects.family).toBe(0);
    }
  });

  it('플래그: 1-1 자동 spoon(카드 2장), 3-5 spoon_hidden(위험), 4-1 자동 first_color', () => {
    expect(scene('1-1').autoFlag).toBe('spoon');
    expect(scene('1-1').choices).toHaveLength(2);
    expect(CONTENT_TEXT).not.toContain('놋수저 한 벌을 산다');
    expect(scene('3-5').choices!.find((c) => c.flag === 'spoon_hidden')).toMatchObject({ text: '놋수저 한 벌을 숨긴다', risk: true });
    expect(scene('4-1').autoFlag).toBe('first_color');
    expect(scene('4-1').choices).toBeUndefined();
    const flagged = ALL_SCENES.flatMap((s) => (s.choices ?? []).filter((c) => c.flag).map((c) => `${s.id}:${c.flag}`));
    expect(flagged).toEqual(['3-5:spoon_hidden']);
    const gated = ALL_SCENES.flatMap((s) => (s.choices ?? []).filter((c) => c.requiresFlag).map((c) => `${s.id}:${c.text}:${c.requiresFlag}`));
    expect(gated).toEqual(['4-3:외가에 놋수저를 보여 드린다:spoon_hidden']);
    expect(scene('4-3').choices!.filter((c) => !c.requiresFlag).length).toBeGreaterThanOrEqual(2);
  });

  it('가족 사건: 2-4 삼촌 apart, 5-6 아버지 apart(선택 없음), 선택에는 setFamily 없음', () => {
    expect(scene('2-4').event).toEqual({ setFamily: { id: 'uncle', status: 'apart' } });
    expect(scene('5-6').event).toEqual({ setFamily: { id: 'father', status: 'apart' } });
    expect(scene('5-6').choices).toBeUndefined();
    expect(ALL_SCENES.filter((s) => s.event).map((s) => s.id)).toEqual(['2-4', '5-6']);
    for (const s of ALL_SCENES) for (const c of s.choices ?? []) expect(c.setFamily, s.id).toBeUndefined();
  });
});

describe('보따리·비교·편지·닫는 장면·낱말', () => {
  it('5-1 보따리: 후보 6(태극기 없음), 3칸, spoon 은 spoon_hidden 조건', () => {
    expect(scene('5-1').bundle).toEqual({
      candidates: ['spoon', 'bundle', 'book', 'radish', 'photo', 'medicine'], slots: 3, requiresFlag: { spoon: 'spoon_hidden' },
    });
    expect(ALL_SCENES.filter((s) => s.bundle)).toHaveLength(1);
  });

  it('비교 5회: 장면·에셋 id·정규화 좌표·r 0.09(2-4 그래프만 0.12)', () => {
    const cmp = ALL_SCENES.filter((s) => s.compare);
    expect(cmp.map((s) => s.id)).toEqual(['1-3', '2-4', '3-2', '4-1', '5-7']);
    for (const s of cmp) {
      const c = s.compare!;
      if (s.id !== '2-4') expect([c.a, c.b]).toEqual([`compare-${s.id}-before`, `compare-${s.id}-after`]);
      expect(c.spots.length).toBeGreaterThanOrEqual(2);
      expect(c.spots.length).toBeLessThanOrEqual(3);
      for (const p of c.spots) {
        expect(p.r).toBe(s.id === '2-4' ? 0.12 : 0.09);
        expect(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1).toBe(true);
      }
    }
    expect(scene('2-4').compare).toMatchObject({ a: 'graph-1916', b: 'graph-1932', graph: { years: [1916, 1924, 1932], tenant: [36.8, 42.2, 54.8] } });
    expect(scene('2-4').compare!.spots).toEqual([
      { x: 0.83, y: 0.6, r: 0.12, label: '1932년 — 빌린 땅 농민이 절반을 넘었다' },
      { x: 0.5, y: 0.7, r: 0.12, label: '1924년 — 해마다 늘어났다' },
    ]);
  });

  it('닫는 장면: brother-with / brother-apart 각 2줄, 둘째 줄은 1983년 방송', () => {
    expect(Object.keys(CLOSING.variants).sort()).toEqual(['brother-apart', 'brother-with']);
    for (const v of Object.values(CLOSING.variants)) {
      expect(v).toHaveLength(2);
      expect(v[1]).toContain('1983년 이산가족 찾기');
    }
  });

  it('낱말 주머니 15~20개, 단어 중복 없음', () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(15);
    expect(TERMS.length).toBeLessThanOrEqual(20);
    expect(new Set(TERMS.map((t) => t.word)).size).toBe(TERMS.length);
  });
});

describe('교과 표기', () => {
  it('지도 내용 source 합집합(장면 + 낱말) = 1..45, 범위 밖 없음', () => {
    const tags = new Set([...ALL_SCENES.flatMap((s) => s.source), ...TERMS.flatMap((t) => t.source)]);
    expect([...tags].sort((a, b) => a - b)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });

  it('금지 문구 0회', () => {
    for (const w of ['전쟁이 끝났', '창씨개명', '공출', '종군 위안부', '흥선대원군', '징용']) expect(CONTENT_TEXT).not.toContain(w);
  });

  it("일본군 '위안부' 는 작은따옴표 포함 형태만", () => {
    expect(CONTENT_TEXT).not.toMatch(/일본군 위안부|종군/);
    expect(CONTENT_TEXT).toMatch(/일본군 '위안부'/);
    expect(CONTENT_TEXT.replace(/일본군 '위안부'/g, '')).not.toContain('위안부');
  });
});
