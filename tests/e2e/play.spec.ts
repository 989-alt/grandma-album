// 완주 e2e(PRD §6-4). 진행은 전부 DOM 클릭. window.__album 은 지금 state 를 읽는 데만 쓴다(어느 장면인지).
import { expect, test, type Page } from '@playwright/test';
import { ALL_SCENES, CLOSING } from '../../src/content';

const KEY = 'grandma-album/v1';
const REPORT_PNG = '../harness/state/grandma-album/reports/T06-result.png';
type Snap = { chapter: number; sceneIdx: number; bgm: string | null };
/** 장 → 곡(T08): 1 market · 2~3 lamp · 4 dawn · 5~6 winter */
const BGM_OF: Record<number, string> = { 1: 'market', 2: 'lamp', 3: 'lamp', 4: 'dawn', 5: 'winter', 6: 'winter' };
const sfx = (page: Page, text: string) => expect(page.getByTestId('sfx')).toHaveText(text);

const sceneOf = (s: Snap) => ALL_SCENES.filter((x) => x.id.startsWith(`${s.chapter}-`))[s.sceneIdx];
const snap = (page: Page) => page.evaluate(() => (window as unknown as { __album: Snap }).__album);
const visible = async (page: Page, sel: string) => (await page.locator(sel).count()) > 0 && page.locator(sel).first().isVisible();
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** 첫 답 계획: wrong 에 든 문항은 처음엔 틀리게, 재출제(retry)·나머지는 맞게. */
async function answerBack(page: Page, wrong: Set<string>, answered: Set<string>, retry: boolean) {
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
  if (retry) await sfx(page, miss ? '스윽' : '탁'); // 재출제 뒷면 판정 자막(main 이 잡는 지점)
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
      const retry = await visible(page, '[data-screen="retry"]');
      if (retry) seen.retry++;
      await answerBack(page, wrong, answered, retry);
    } else if (await button(page, '다음 사진').count()) {
      await button(page, '다음 사진').click();
    } else if (await page.locator('.card:enabled').count()) {
      await page.locator('.card:enabled').first().click();
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
  const seen = await drive(page, wrong, () => visible(page, '[data-screen="result"]'));
  expect(seen.closing).toBe(true); // 닫는 장면은 항상
  expect(seen.retry).toBe(2); // 장당 1개: 1장(1-2), 3장(3-4)

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

  // 저장본: 키 1개, v===1, 6장 시작에서 덮어쓴 것
  const ls = await storage(page);
  expect(Object.keys(ls)).toEqual([KEY]);
  const s = JSON.parse(ls[KEY]!);
  expect(s.v).toBe(1);
  expect(s).toMatchObject({ chapter: 6, sceneIdx: 0 });
  for (const k of ['stats', 'family', 'flags', 'bundle', 'answers', 'retryQueue', 'compareHits', 'letterMoods', 'startedAt', 'playMs']) expect(s).toHaveProperty(k);
  expect(s.bundle).toHaveLength(3);
  expect(s.letterMoods.length).toBeGreaterThan(0);

  // 타이틀 = 저장 유지
  await button(page, '타이틀').click();
  await expect(button(page, '사진첩 열기')).toBeVisible();
  expect(Object.keys(await storage(page))).toEqual([KEY]);
  expect((await snap(page)).bgm).toBeNull();
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
