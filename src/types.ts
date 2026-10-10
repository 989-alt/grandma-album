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
}

export interface Spot { x: number; y: number; r: number; label: string }

export type Back =
  | { type: 'initial'; prompt: string; answer: string; hint: string; source: number[] }
  | { type: 'ox'; prompt: string; answer: boolean; hint: string; source: number[] };

export interface Scene {
  id: string;
  photoAsset: string;
  narration: string;
  dialogue: string[];
  source: number[];
  choices?: Choice[];
  bundle?: { candidates: string[]; slots: 3 };
  compare?: { a: string; b: string; spots: Spot[] };
  letter?: { lines: string[]; moods: string[] };
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
}

export interface Term { word: string; meaning: string; source: number[] }

export interface Content {
  chapters: Chapter[];
  terms: Term[];
  closing: { variants: Record<FamilyStatus, string> };
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
