import { CHAPTERS } from './chapters';
import { TERMS } from './terms';
import { CLOSING } from './closing';

export { CHAPTERS, TERMS, CLOSING };
export type { ClosingKey } from './closing';
export const ALL_SCENES = CHAPTERS.flatMap((c) => c.scenes);
