import { LineBreaker } from 'linebreak';
import { syllableBoundaries } from '../segment/syllables.ts';

export interface BreakOpportunity {
  /** The UTF-16 offset where the next line may start. */
  position: number;
  /** A mandatory break: after a newline, or at the end of the text. */
  required: boolean;
}

/**
 * Line break opportunities. UAX #14 break points come from `linebreak`; each one that is inside
 * a grapheme, or inside an orthographic syllable of a Brahmic script, is removed. (Syllables
 * are whole graphemes, so one test covers both.) The end of the text is always a mandatory
 * break (UAX #14 LB3). Offset 0 is never a break.
 */
export function lineBreakOpportunities(text: string, lang: string): BreakOpportunity[] {
  if (text.length === 0) return [];
  const units = new Set(syllableBoundaries(text, lang));
  const breaks: BreakOpportunity[] = [];
  const breaker = new LineBreaker(text);
  for (let b = breaker.nextBreak(); b; b = breaker.nextBreak()) {
    if (b.position <= 0 || b.position > text.length) continue;
    if (!b.required && !units.has(b.position)) continue;
    breaks.push({ position: b.position, required: b.required || b.position === text.length });
  }
  if (breaks.at(-1)?.position !== text.length) {
    breaks.push({ position: text.length, required: true });
  }
  return breaks;
}
