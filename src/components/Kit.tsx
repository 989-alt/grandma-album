// 킷 조각 URL + 작은 원형(버튼·이름표·쪽지). 그림 연결(webp 변환·PHOTOS)은 T07 이 src/assets.ts 로 옮긴다.
import type { ComponentChildren } from 'preact';
import { TERMS } from '../content';
import { KIT } from '../assets';

/** assets/ui/kit/*.png — 이름(확장자 없음) → URL */
export const UI = KIT;
/** assets/img/kit/*.png — 주인공 표정·1~2장 가족 초상·물건 */
export const IMG = KIT;

type Kind = 'indigo' | 'amber' | 'paper';
export function Btn({ kind, label, onClick, left, top, width = 120, disabled }: {
  kind: Kind; label: string; onClick: () => void; left: number; top: number; width?: number; disabled?: boolean;
}) {
  return (
    <button type="button" class={`btn ${kind} abs${disabled ? ' pressed' : ''}`} style={{ left, top, width }} disabled={disabled} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

export function Nameplate({ left, top, width = 200, text }: { left: number; top: number; width?: number; text: string }) {
  return <div class="nameplate abs" style={{ left, top, width }}><span>{text}</span></div>;
}

export function Wide({ label, onClick, left, top }: { label: string; onClick: () => void; left: number; top: number }) {
  return (
    <button type="button" class="key wide abs" style={{ left, top }} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

/** 보따리 물건 id → 이름(img alt). */
export const ITEM_NAME: Record<string, string> = { spoon: '놋수저', bundle: '보자기', book: '책', radish: '무 바구니', photo: '사진', medicine: '약병' };

// 교과서 용어(낱말 주머니 낱말) 강조. 긴 낱말 먼저. 앞뒤가 둘 다 한글 음절이면 더 긴 낱말의 일부('한국광복군' 안의 '광복')라 강조하지 않는다.
const TERM_RE = new RegExp(TERMS.map((t) => t.word).sort((a, b) => b.length - a.length).join('|'), 'g');
const SYL = /[가-힣]/;
export function emphasize(text: string): ComponentChildren {
  const out: ComponentChildren[] = [];
  let at = 0;
  for (const m of text.matchAll(TERM_RE)) {
    const a = m.index!;
    const b = a + m[0].length;
    if (SYL.test(text[a - 1] ?? '') && SYL.test(text[b] ?? '')) continue;
    out.push(text.slice(at, a), <b key={a}>{m[0]}</b>);
    at = b;
  }
  out.push(text.slice(at));
  return out;
}

/** 쪽지(speech-note 통짜 img). 수치 = 2-세피아-gen.py note(): 원 액자 (201,212) r148, 글 x ≥ (376·s)+14. */
export function Note({ left, top, width, portrait, alt, text, onClick }: {
  left: number; top: number; width: number; portrait: string; alt: string; text: string; onClick?: () => void;
}) {
  const s = width / 1014;
  const h = Math.round(452 * s);
  const r = 148 * s;
  const tl = Math.round(376 * s) + 14;
  return (
    <div class="note" style={{ left, top, width, height: h }} onClick={onClick}>
      <img class="paper" src={UI['speech-note']} alt="" />
      <div class="portrait" style={{ left: Math.round(201 * s - r), top: Math.round(212 * s - r), width: Math.round(2 * r), height: Math.round(2 * r) }}>
        <img src={portrait} alt={alt} />
      </div>
      <div class="say" style={{ left: tl, top: Math.round(h * 0.07), width: width - tl - Math.round(width * 0.06) }}>{emphasize(text)}</div>
    </div>
  );
}
