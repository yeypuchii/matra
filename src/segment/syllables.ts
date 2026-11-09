// Orthographic syllables of the Brahmic scripts that matra knows (Devanagari, Bengali, Tamil).
//
// Written from the syllable structure in the OpenType script development specifications
// ("Developing OpenType Fonts for Devanagari / Bengali / Tamil Script", Indic2) and the code
// charts of the Unicode Standard. Each code point gets one category letter, and a regular
// expression over those letters finds the syllables:
//
//   consonant syllable   {C N? (H J? | J H)} C N? D? [H J? | {M N? H?}] {S|D}
//   vowel syllable       [R H] V N? [J? H C | J C] {M N? H?} {S|D}
//   placeholder syllable [R H] B N? [J? H C] {M N? H?} {S|D}
//   broken syllable      a run of marks with no base
//
//   C consonant (R: the consonant ra)   V independent vowel   N nukta   H virama (halant)
//   J ZWJ or ZWNJ   M dependent vowel sign (matra)   S syllable modifier (candrabindu,
//   anusvara, visarga)   D Vedic sign or tone mark   B placeholder base (NBSP, U+25CC)
//   X anything else
//
// Text in other scripts, and characters that start no syllable, fall back to graphemes. A
// syllable is always one or more whole graphemes: in Tamil, க்ஷ is one syllable and two
// graphemes; a grapheme is never split into two syllables.

import { graphemeBoundaries } from './intl.ts';

type Category = 'C' | 'R' | 'V' | 'N' | 'H' | 'J' | 'M' | 'S' | 'D' | 'B' | 'X';

// [first, last, category] for each range, sorted. Code points in no range are X.
const RANGES: readonly [number, number, Category][] = [
  [0x00a0, 0x00a0, 'B'], // NO-BREAK SPACE
  // Devanagari
  [0x0900, 0x0903, 'S'], // inverted candrabindu, candrabindu, anusvara, visarga
  [0x0904, 0x0914, 'V'],
  [0x0915, 0x092f, 'C'],
  [0x0930, 0x0930, 'R'],
  [0x0931, 0x0939, 'C'],
  [0x093a, 0x093b, 'M'],
  [0x093c, 0x093c, 'N'],
  [0x093e, 0x094c, 'M'],
  [0x094d, 0x094d, 'H'],
  [0x094e, 0x094f, 'M'],
  [0x0951, 0x0954, 'D'], // udatta, anudatta, grave, acute
  [0x0955, 0x0957, 'M'],
  [0x0958, 0x095f, 'C'], // consonants with nukta, precomposed
  [0x0960, 0x0961, 'V'],
  [0x0962, 0x0963, 'M'],
  [0x0972, 0x0977, 'V'],
  [0x0978, 0x097f, 'C'],
  // Bengali
  [0x0981, 0x0983, 'S'],
  [0x0985, 0x098c, 'V'],
  [0x098f, 0x0990, 'V'],
  [0x0993, 0x0994, 'V'],
  [0x0995, 0x09a8, 'C'],
  [0x09aa, 0x09af, 'C'],
  [0x09b0, 0x09b0, 'R'],
  [0x09b2, 0x09b2, 'C'],
  [0x09b6, 0x09b9, 'C'],
  [0x09bc, 0x09bc, 'N'],
  [0x09be, 0x09c4, 'M'],
  [0x09c7, 0x09c8, 'M'],
  [0x09cb, 0x09cc, 'M'],
  [0x09cd, 0x09cd, 'H'],
  [0x09ce, 0x09ce, 'C'], // khanda ta, a dead consonant
  [0x09d7, 0x09d7, 'M'], // au length mark
  [0x09dc, 0x09dd, 'C'],
  [0x09df, 0x09df, 'C'],
  [0x09e0, 0x09e1, 'V'],
  [0x09e2, 0x09e3, 'M'],
  [0x09f0, 0x09f0, 'R'], // Assamese ra
  [0x09f1, 0x09f1, 'C'],
  [0x09fe, 0x09fe, 'S'], // sandhi mark
  // Tamil. Tamil has no reph, so its ra is a plain consonant.
  [0x0b82, 0x0b82, 'S'],
  [0x0b85, 0x0b8a, 'V'],
  [0x0b8e, 0x0b90, 'V'],
  [0x0b92, 0x0b94, 'V'],
  [0x0b95, 0x0b95, 'C'],
  [0x0b99, 0x0b9a, 'C'],
  [0x0b9c, 0x0b9c, 'C'],
  [0x0b9e, 0x0b9f, 'C'],
  [0x0ba3, 0x0ba4, 'C'],
  [0x0ba8, 0x0baa, 'C'],
  [0x0bae, 0x0bb9, 'C'],
  [0x0bbe, 0x0bc2, 'M'],
  [0x0bc6, 0x0bc8, 'M'],
  [0x0bca, 0x0bcc, 'M'],
  [0x0bcd, 0x0bcd, 'H'],
  [0x0bd7, 0x0bd7, 'M'], // au length mark
  // Vedic Extensions: the marks are D, the spacing signs like ardhavisarga are S
  [0x1cd0, 0x1cd2, 'D'],
  [0x1cd4, 0x1ce8, 'D'],
  [0x1ced, 0x1ced, 'D'],
  [0x1cf2, 0x1cf3, 'S'],
  [0x1cf4, 0x1cf4, 'D'],
  [0x1cf7, 0x1cf7, 'S'],
  [0x1cf8, 0x1cf9, 'D'],
  [0x200c, 0x200d, 'J'], // ZWNJ, ZWJ
  [0x25cc, 0x25cc, 'B'], // DOTTED CIRCLE
  // Devanagari Extended
  [0xa8e0, 0xa8f1, 'D'], // combining digits, letters and signs above
  [0xa8fe, 0xa8fe, 'V'],
  [0xa8ff, 0xa8ff, 'M'],
];

function categoryOf(cp: number): Category {
  let lo = 0;
  let hi = RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [first, last, category] = RANGES[mid] as [number, number, Category];
    if (cp < first) hi = mid - 1;
    else if (cp > last) lo = mid + 1;
    else return category;
  }
  return 'X';
}

const matraGroup = 'MN?H?';
const consonant = '[CR]N?';
const SYLLABLE = new RegExp(
  [
    // vowel syllable, with an optional reph (ra + virama) before it
    `(?:RH)?VN?(?:J?H[CR]|J[CR])?(?:${matraGroup}){0,4}[SD]*`,
    // consonant syllable: linked consonants, then a final virama or vowel signs
    `(?:${consonant}(?:HJ?|JH))*${consonant}D?(?:HJ?|(?:${matraGroup}){1,4})?[SD]*`,
    // a placeholder (NBSP, dotted circle) as the base
    `(?:RH)?BN?(?:J?H[CR])?(?:${matraGroup}){0,4}[SD]*`,
    // marks with no base
    '[NHMSD][NHMSDJ]*',
  ].join('|'),
  'y',
);

/** The orthographic syllables of the text, as boundaries: 0, ..., text.length. */
export function syllableBoundaries(text: string, lang: string): number[] {
  if (text.length === 0) return [];
  // One category letter for each code point, and the UTF-16 offset of each code point.
  let categories = '';
  const offsets: number[] = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i) as number;
    offsets.push(i);
    categories += categoryOf(cp);
    i += cp > 0xffff ? 2 : 1;
  }
  offsets.push(text.length);

  const graphemes = graphemeBoundaries(text, lang);
  const boundaries = [0];
  let g = 1; // the next grapheme boundary to look at
  let k = 0; // the code point to look at
  while (k < categories.length) {
    const start = offsets[k] as number;
    SYLLABLE.lastIndex = k;
    const length = SYLLABLE.exec(categories)?.[0].length ?? 0;
    let end: number;
    if (length > 0) {
      k += length;
      end = offsets[k] as number;
    } else {
      // No syllable starts here: take the grapheme.
      while ((graphemes[g] as number) <= start) g++;
      end = graphemes[g] as number;
      while ((offsets[k] as number) < end) k++;
    }
    // A syllable is one or more whole graphemes. Where the grammar ends a syllable inside a
    // grapheme (before a mark with no base, or a mark of another script), it goes on.
    while ((graphemes[g] as number) < end) g++;
    if (graphemes[g] === end) boundaries.push(end);
  }
  return boundaries;
}
