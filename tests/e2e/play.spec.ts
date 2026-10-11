// 완주 e2e(PRD §6-4). 진행은 전부 DOM 클릭. window.__album 은 지금 state 를 읽는 데만 쓴다(어느 장면인지).
import { expect, test, type Page } from '@playwright/test';
import { ALL_SCENES, CLOSING } from '../../src/content';

const KEY = 'grandma-album/v1';
const REPORT_PNG = '../harness/state/grandma-album/reports/T06-result.png';
const T09 = (name: string) => `../harness/state/grandma-album/reports/T09-${name}.png`;
type Snap = { chapter: number; sceneIdx: number; bgm: string | null };
/** 장 → 곡(T08): 1 market · 2~3 lamp · 4 dawn · 5~6 winter */
const BGM_OF: Record<number, string> = { 1: 'market', 2: 'lamp', 3: 'lamp', 4: 'dawn', 5: 'winter', 6: 'winter' };
const sfx = (page: Page, text: string) => expect(page.getByTestId('sfx')).toHaveText(text);

const sceneOf = (s: Snap) => ALL_SCENES.filter((x) => x.id.startsWith(`${s.chapter}-`))[s.sceneIdx];
const snap = (page: Page) => page.evaluate(() => (window as unknown as { __album: Snap }).__album);
const visible = async (page: Page, sel: string) => (await page.locator(sel).count()) > 0 && page.locator(sel).first().isVisible();
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** 첫 답 계획: wrong 에 든 문항은 처음엔 틀리게, 재출제(retry)·나머지는 맞게. */
async function answerBack(page: Page, wrong: Set<string>, answered: Set<string>) {
  const where = (await page.locator('.nameplate span').first().textContent()) ?? '';
  const id = where.split(' · ')[1];
  const sc = ALL_SCENES.find((s) => s.id === id)!;
  const miss = wrong.has(id) && !answered.has(id);
  answered.add(id);
  const b = sc.back;
  if (b.type === 'ox') {
    await button(page, (b.answer !== miss) ? 'O' : 'X').click();
  } else {
    const keys = page.locator('.keys button');
    const chars = [...b.answer.replace(/\s/g, '')];
    if (miss) {
      for (let i = 0; i < chars.length; i++) await keys.nth(i).click(); // 열쇠 순서대로 = 정답 순서와 다름
    } else {
      const used = new Set<number>();
      for (const c of chars) {
        const i = b.keys.findIndex((k, j) => k === c && !used.has(j));
        used.add(i);
        await keys.nth(i).click();
      }
    }
  }
  await expect(page.locator(`.stamp[alt="${miss ? '오답 ✗' : '정답 ✓'}"]`)).toBeVisible();
  await sfx(page, miss ? '스윽' : '탁'); // 뒷면 판정 자막(장면·재출제 모두)
}

/** 화면에 보이는 것 하나를 처리하며 stop() 이 참이 될 때까지 진행. */
async function drive(page: Page, wrong: Set<string>, stop: () => Promise<boolean>) {
  const answered = new Set<string>();
  const seen = { closing: false, retry: 0 };
  for (let guard = 0; guard < 2000; guard++) {
    if (await stop()) return seen;
    if (await visible(page, '[data-screen="closing"]')) {
      seen.closing = true;
      await expect(page.getByText(CLOSING.variants['brother-with'][1])).toBeVisible();
      await button(page, '다음').click();
    } else if (await visible(page, '.screen-bundle')) {
      const tiles = page.locator('.screen-bundle .tile');
      for (let i = 0; i < 3; i++) await tiles.nth(i).click();
      await button(page, '떠난다').click();
      await sfx(page, '찰칵');
    } else if (await visible(page, '.screen-letter')) {
      if (await visible(page, '.screen-letter .skip')) await page.locator('.screen-letter .skip').click();
      await page.locator('.screen-letter .mood').first().click();
      await button(page, '다음').click();
    } else if (await visible(page, '.screen-compare')) {
      const sp = sceneOf(await snap(page)).compare!.spots[0];
      const after = page.getByTestId('after');
      const box = (await after.boundingBox())!;
      await after.click({ position: { x: sp.x * box.width, y: sp.y * box.height } });
      await expect(button(page, '그만 보기')).toBeEnabled();
      await sfx(page, '띵');
      await button(page, '그만 보기').click();
    } else if ((await visible(page, '.keys')) || (await button(page, 'O').count()) > 0) {
      if (await visible(page, '[data-screen="retry"]')) seen.retry++;
      await answerBack(page, wrong, answered);
    } else if (await button(page, '다음 사진').count()) {
      await button(page, '다음 사진').click();
    } else if (await page.locator('.card:enabled').count()) {
      await page.locator('.card:enabled').first().click();
      await sfx(page, '사락'); // 카드 탭
      await sfx(page, '찰칵'); // 변화 1초 뒤 인화
    } else if (await page.locator('.slot.glow').count()) {
      const s = await snap(page);
      expect(s.bgm).toBe(BGM_OF[s.chapter]); // 사진첩 = 그 장의 곡
      await page.locator('.slot.glow').click();
    } else if (await button(page, '다음').count()) {
      await button(page, '다음').click();
    } else {
      await page.waitForTimeout(100);
    }
  }
  throw new Error('drive: 진행이 멈춤');
}

const storage = (page: Page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));

test('(a) 완주 — 정답·오답 섞어서, 결과 7항·틀린 문제·닫는 장면·저장 스키마', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect((await snap(page)).bgm).toBeNull(); // 타이틀 = 곡 없음
  await button(page, '사진첩 열기').click();
  await sfx(page, '톡'); // 장 시작 저장 자막
  // 초성 오답 1(1-2), O·X 오답 2(1-4, 3-4)
  const wrong = new Set(['1-2', '1-4', '3-4']);
  const seen = await drive(page, wrong, () => visible(page, '[data-screen="closing"]'));
  expect(seen.retry).toBe(2); // 장당 1개: 1장(1-2), 3장(3-4)

  // 닫는 장면 직전 저장본: 키 1개, v===1, 6장 시작에서 덮어쓴 것
  const ls = await storage(page);
  expect(Object.keys(ls)).toEqual([KEY]);
  const s = JSON.parse(ls[KEY]!);
  expect(s.v).toBe(1);
  expect(s).toMatchObject({ chapter: 6, sceneIdx: 0 });
  for (const k of ['stats', 'family', 'flags', 'bundle', 'answers', 'retryQueue', 'compareHits', 'letterMoods', 'startedAt', 'playMs']) expect(s).toHaveProperty(k);
  expect(s.bundle).toHaveLength(3);
  expect(s.letterMoods.length).toBeGreaterThan(0);
  expect(s.flags.spoon).toBe(true); // 1-1 장면 사건

  expect((await drive(page, wrong, () => visible(page, '[data-screen="result"]'))).closing).toBe(true); // 닫는 장면은 항상

  // 결과 7항
  await expect(page.getByTestId('r-time')).toHaveText(/^\d+분$/);
  await expect(page.getByTestId('r-reached')).toHaveText('6장 · 1953 · 6-2');
  await expect(page.getByTestId('r-rate')).toHaveText('90% (27/30)');
  await expect(page.getByTestId('r-wrong').locator('button')).toHaveText(['1-2', '1-4', '3-4']);
  await expect(page.getByTestId('r-family').locator('[data-frame]')).toHaveCount(5);
  await expect(page.getByTestId('r-family').locator('[data-frame="empty"]')).not.toHaveCount(0); // 5-6 아버지
  await expect(page.getByTestId('r-items').locator('.key img')).not.toHaveCount(0);
  await expect(page.getByTestId('r-items').locator('[data-item="spoon"]')).toHaveCount(1); // 보따리에 든 놋수저는 따로 또 그리지 않음
  await expect(page.getByTestId('r-words').locator('.say')).toHaveText(/놋수저/);
  await expect(page.getByTestId('r-question')).toHaveText('내가 그때 학생이었다면, 학도병으로 나갔을까?');
  await expect(page.getByText(/잘했|훌륭|아쉬|실패|성공/)).toHaveCount(0); // 평가 문구 없음
  await page.screenshot({ path: REPORT_PNG });

  // 틀린 문항 다시 보기 → 읽기 전용 뒷면 → 뒤표지
  await page.getByTestId('r-wrong').getByRole('button', { name: '1-2 사진 뒷면 다시 보기' }).click();
  await expect(page.locator('.nameplate span').first()).toHaveText(/1-2/);
  await button(page, '뒤표지').click();
  await expect(page.locator('[data-screen="result"]')).toBeVisible();

  // 완주(결과 진입) = 저장 삭제 → 타이틀에서 '이어하기' 없이 새로 시작
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await button(page, '타이틀').click();
  await expect(button(page, '사진첩 열기')).toBeVisible();
  expect((await snap(page)).bgm).toBeNull();
  await button(page, '사진첩 열기').click();
  await expect(page.getByRole('button', { name: '1-1 사진 붙이기' })).toBeVisible();
  expect(errors).toEqual([]); // 자동재생 차단 등 콘솔 에러 0
});

test('(b) 이어하기 — 3장 중간에서 reload → 3장 첫 장면', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await button(page, '사진첩 열기').click();
  await drive(page, new Set(), async () => {
    const s = await snap(page);
    return s.chapter === 3 && s.sceneIdx === 2 && (await visible(page, '.slot.glow'));
  });
  await page.reload();
  await button(page, '사진첩 열기').click();
  await button(page, '이어하기(3장 · 1938~1945)').click();
  await expect(page.getByRole('button', { name: '3-1 사진 붙이기' })).toBeVisible();
  const s = JSON.parse((await storage(page))[KEY]!);
  expect(s).toMatchObject({ v: 1, chapter: 3, sceneIdx: 0 });
});

test('(c) 다시하기 → 저장본 삭제', async ({ page }) => {
  await page.goto('/');
  await button(page, '사진첩 열기').click(); // 새로 시작 = 1장 저장
  expect(Object.keys(await storage(page))).toEqual([KEY]);
  await page.goto('/?screen=result&perfect=1');
  await button(page, '다시하기').click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(button(page, '사진첩 열기')).toBeVisible();
});

test('(d) 틀린 문제 0 → "모두 맞았어요"', async ({ page }) => {
  await page.goto('/?screen=result&perfect=1');
  await expect(page.getByTestId('r-wrong')).toHaveText('모두 맞았어요');
  await expect(page.getByTestId('r-rate')).toHaveText('100% (30/30)');
});

test('(d2) 30문항 모두 오답 → 결과 틀린 문제 30칸 전부 무대 안, 칩 44px 이상, 마지막 칩 탭 가능', async ({ page }) => {
  const done = ALL_SCENES.filter((sc) => !sc.id.startsWith('6-'));
  const st = {
    v: 1, chapter: 6, sceneIdx: 0, stats: { family: 2, home: 2, third: 2 },
    family: { father: 'apart', mother: 'with', brother: 'with', okbun: 'with', little: 'with' },
    flags: { spoon: true, spoon_hidden: false, first_color: true }, bundle: ['bundle', 'book', 'medicine'],
    answers: done.map((sc) => ({ sceneId: sc.id, correct: false, retried: sc.id.endsWith('-1') })),
    retryQueue: [], compareHits: {}, letterMoods: [], startedAt: 0, playMs: 0,
  };
  await page.goto('/');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(st)]);
  await page.reload();
  await button(page, '사진첩 열기').click();
  await page.getByRole('button', { name: /^이어하기/ }).click();
  await drive(page, new Set(ALL_SCENES.map((sc) => sc.id)), () => visible(page, '[data-screen="result"]'));
  const chips = page.getByTestId('r-wrong').locator('button');
  await expect(chips).toHaveCount(30);
  for (const b of await chips.all()) {
    const r = (await b.boundingBox())!;
    expect(r.width).toBeGreaterThanOrEqual(44);
    expect(r.height).toBeGreaterThanOrEqual(44);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(1024);
    expect(r.y + r.height).toBeLessThanOrEqual(768);
  }
  await page.screenshot({ path: '../harness/state/grandma-album/reports/T12-result-30.png' });
  await button(page, '6-2 사진 뒷면 다시 보기').click();
  await expect(page.locator('.nameplate')).toContainText('6-2');
});

test('(e) 키보드만으로 비교 1장면 — Tab·Enter', async ({ page }) => {
  await page.goto('/?screen=scene&id=1-3');
  await drive(page, new Set(), () => visible(page, '.screen-compare')); // 비교 화면까지는 클릭으로
  const focused = () => page.evaluate(() => document.activeElement?.className ?? '');
  for (let i = 0; i < 10 && !(await focused()).includes('spot-key'); i++) await page.keyboard.press('Tab');
  expect(await focused()).toContain('spot-key');
  await page.keyboard.press('Enter');
  await expect(button(page, '그만 보기')).toBeEnabled();
  await sfx(page, '띵');
  await expect(page.locator('.screen-compare .spot-label')).toHaveCount(1);
  await page.keyboard.press('Tab'); // 다음 스팟 — 포커스 링 보임
  await page.screenshot({ path: T09('compare-focus') });
  for (let i = 0; i < 10 && (await page.evaluate(() => document.activeElement?.textContent)) !== '그만 보기'; i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.screen-compare')).toHaveCount(0);
  await expect(page.locator('.back')).toBeVisible(); // T10: 비교 뒤 = 같은 장면 뒷면
  await expect(page.locator('.nameplate span').first()).toHaveText(/1-3/);
});

test('(f) 깨진 저장본(chapter 99) → 타이틀 정상 + 토스트, 저장 삭제', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, chapter: 99, sceneIdx: 0, stats: { family: 2, home: 2, third: 1 }, flags: {} })), KEY);
  await page.reload();
  await expect(button(page, '사진첩 열기')).toBeVisible();
  await expect(page.getByText('저장된 사진첩을 열 수 없어 처음부터 시작해요')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('(g) 1366×700 창 — 무대가 맞춰 줄어 하단 \'다음\' 버튼까지 보임', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 700 });
  await page.goto('/?screen=scene&id=1-1');
  const b = (await button(page, '다음').boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(700);
  expect(b.x + b.width).toBeLessThanOrEqual(1366);
  await page.screenshot({ path: T09('scene-1366x700') });
});

const T10 = (name: string) => `../harness/state/grandma-album/reports/T10-${name}.png`;
type Stats = { family: number; home: number; third: number };
const stats = async (page: Page) => (await page.evaluate(() => (window as unknown as { __album: { stats: Stats } }).__album.stats));

test('(h) T10 비교 장면 순서 1-3: 선택 → 인화 → 비교 → 뒷면, 인화 중 사진첩 이탈 후 다시 해도 효과 1번', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?screen=scene&id=1-3');
  const s0 = await stats(page);
  const card = page.locator('.card:enabled', { hasText: '소학교에 간다' });
  const toCard = () => drive(page, new Set(), async () => (await card.count()) > 0);
  await toCard();
  await card.click();
  await button(page, '사진첩').click(); // 변화·인화 도중 이탈
  await expect(page.getByRole('button', { name: '1-3 사진 붙이기' })).toBeVisible();
  expect(await stats(page)).toEqual(s0); // 선택 효과는 아직 game 에 없음
  await page.getByRole('button', { name: '1-3 사진 붙이기' }).click();
  await toCard();
  await card.click();
  await sfx(page, '찰칵');
  await expect(page.locator('.screen-compare')).toBeVisible(); // 인화 뒤 곧바로 비교 — 뒷면을 답하지 않았다
  await expect(page.locator('.back')).toHaveCount(0);
  const s1 = await stats(page);
  expect(s1).toEqual({ ...s0, home: s0.home - 1, third: s0.third + 1 }); // 한 번만
  await page.screenshot({ path: T10('compare-before-back') });
  await drive(page, new Set(), () => visible(page, '.back')); // 비교 처리 → 뒷면
  await expect(page.locator('.screen-compare')).toHaveCount(0);
  await expect(page.locator('.nameplate span').first()).toHaveText(/1-3/);
  expect(await stats(page)).toEqual(s1);
  await drive(page, new Set(), () => visible(page, '.slot.glow'));
  await expect(page.getByRole('button', { name: '1-4 사진 붙이기' })).toBeVisible();
  expect(await stats(page)).toEqual(s1);
  expect(errors).toEqual([]); // 효과음 파일 없어도 콘솔 에러 0
});

for (const [name, moods] of [['plain', ['fear']], ['withLetter', ['kin', 'return']]] as const) {
  test(`(i) T10 편지 5-5 순서 + 판정 뒤 쪽지(${name})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/?screen=scene&id=5-5');
    await drive(page, new Set(), () => visible(page, '.screen-letter')); // 선택 → 인화 → 편지
    await expect(page.locator('.back')).toHaveCount(0);
    await page.locator('.screen-letter .skip').click();
    for (const m of moods) await page.locator(`.screen-letter .mood[data-mood="${m}"]`).click();
    await button(page, '다음').click();
    await expect(page.locator('.back')).toBeVisible(); // 편지 → 뒷면
    await expect(page.locator('.nameplate span').first()).toHaveText(/5-5/);
    await expect(page.locator('.note')).toHaveCount(0);
    await button(page, 'O').click();
    const an = ALL_SCENES.find((s) => s.id === '5-5')!.back.afterNote!;
    await expect(page.locator('.note .say')).toHaveText(an[name]);
    if (name === 'withLetter') await page.screenshot({ path: T10('letter-note') });
    await button(page, '다음 사진').click();
    await expect(page.getByRole('button', { name: '5-6 사진 붙이기' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
