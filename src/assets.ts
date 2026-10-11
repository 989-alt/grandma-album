// T07 에셋 연결: assets/build/(scripts/build-assets.py 변환본) → URL. singlefile 빌드에서 전부 base64 인라인.
import './styles/fonts.css';
import { ALL_SCENES } from './content';

const glob = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([p, url]) => [p.slice(p.lastIndexOf('/') + 1, p.lastIndexOf('.')), url]));

/** 장면(photoAsset = scene-*)·비교(compare-*-before/after)·key-title → URL */
export const PHOTOS: Record<string, string> = glob(import.meta.glob('../assets/build/img/*.webp', { eager: true, import: 'default' }) as Record<string, string>);
/** img 로 쓰는 킷 조각(assets/ui/kit + assets/img/kit, 이름 겹침 없음) → URL.
 *  9-slice 조각(btn·key·panel·frame·slot·strip·nameplate·photo-back)은 CSS border-image 로만 쓰므로 빼서 같은 그림이 두 번 인라인되지 않게 한다. */
export const KIT: Record<string, string> = glob(import.meta.glob(
  ['../assets/build/kit/*.webp', '!**/btn-*', '!**/key-*', '!**/page-panel.*', '!**/photo-frame.*', '!**/photo-back.*', '!**/slot-empty.*', '!**/strip.*', '!**/nameplate.*'],
  { eager: true, import: 'default' },
) as Record<string, string>);

export type BgmId = 'market' | 'lamp' | 'dawn' | 'winter';
export const BGM = glob(import.meta.glob('../assets/build/bgm/*.mp3', { eager: true, import: 'default' }) as Record<string, string>) as Record<BgmId, string>;

/** 효과음은 소리 없이 자막만(Gemini 생성 경로 미확정). */
export const SFX_CAPTIONS = [
  { id: 'print', caption: '찰칵' },
  { id: 'correct', caption: '탁' },
  { id: 'wrong', caption: '스윽' },
  { id: 'card', caption: '사락' },
  { id: 'found', caption: '띵' },
  { id: 'save', caption: '톡' },
] as const;

// photoAsset·비교 키가 PHOTOS 에 없으면 그 칸은 빈 사진틀(undefined) — 경고는 한 번만.
const missing = ALL_SCENES.flatMap((s) => [s.photoAsset, ...(s.compare && !s.compare.graph ? [s.compare.a, s.compare.b] : [])]).filter((k) => !PHOTOS[k]);
if (missing.length) console.warn(`[assets] 그림 없음 ${missing.length}: ${missing.join(', ')}`);

/** 키 → URL, 없으면 undefined(빈 사진틀). */
export const photo = (key: string | undefined): string | undefined => (key ? PHOTOS[key] : undefined);
