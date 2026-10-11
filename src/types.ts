// PRD §8 데이터 모델 그대로 (필드명 동일)

export type StatKey = 'family' | 'home' | 'third';
export type Stats = Record<StatKey, number>;
export type FamilyStatus = 'with' | 'apart' | 'unknown';
export type ThirdAxis = 'new' | 'language' | 'hope';

export interface FamilyMember { id: string; name: string; role: string }

export interface Choice {
  text: string;
  effects: Stats;
  lock?: { stat: StatKey; min: number };
  flag?: keyof Flags;
  setFamily?: { id: string; status: FamilyStatus };
  risk?: true;
  /** 이 플래그가 없으면 카드를 숨긴다(엔진 visibleChoices). */
  requiresFlag?: keyof Flags;
}

export interface Spot { x: number; y: number; r: number; label: string }

/** afterNote(5-5): 판정 뒤 할머니 쪽지 — 편지 마음에 'kin'·'return' 이 있으면 withLetter, 아니면 plain. */
type AfterNote = { afterNote?: { withLetter: string; plain: string } };
export type Back =
  | ({ type: 'initial'; prompt: string; answer: string; hint: string; keys: string[]; source: number[] } & AfterNote)
  | ({ type: 'ox'; prompt: string; answer: boolean; fix: string; source: number[] } & AfterNote);

export interface Scene {
  id: string;
  photoAsset: string;
  narration: string;
  dialogue: string[];
  source: number[];
  choices?: Choice[];
  /** 장면에 들어오면 켜지는 플래그(1-1 spoon, 4-1 first_color). */
  autoFlag?: keyof Flags;
  /** 선택과 무관한 장면 사건(2-4 삼촌, 5-6 아버지). */
  event?: { setFamily: { id: string; status: FamilyStatus } };
  /** requiresFlag: 후보 → 그 후보를 허용하는 플래그. */
  bundle?: { candidates: string[]; slots: 3; requiresFlag: Record<string, keyof Flags> };
  compare?: { a: string; b: string; captionA: string; captionB: string; title: string; spots: Spot[]; graph?: { years: number[]; tenant: number[] } };
  letter?: { lines: string[]; moods: { id: string; text: string }[] };
  back: Back;
}

export interface Chapter {
  id: string;
  title: string;
  era: string;
  protagonist: string;
  family: FamilyMember[];
  thirdAxis: ThirdAxis;
  scenes: Scene[];
  /** 장 끝 할머니 한 줄. */
  outro?: string;
}

export type ClosingKey = 'brother-with' | 'brother-apart';

export interface Term { word: string; meaning: string; source: number[] }

export interface Content {
  chapters: Chapter[];
  terms: Term[];
  closing: { variants: Record<ClosingKey, [string, string]> };
}

export interface Flags { spoon: boolean; spoon_hidden: boolean; first_color: boolean }

export interface Answer { sceneId: string; correct: boolean; retried: boolean }

export interface State {
  v: 1;
  chapter: number;
  sceneIdx: number;
  stats: Stats;
  family: Record<string, FamilyStatus>;
  flags: Flags;
  bundle: string[];
  answers: Answer[];
  retryQueue: string[];
  compareHits: Record<string, number>;
  letterMoods: string[];
  startedAt: number;
  playMs: number;
}
