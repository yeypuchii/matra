// fast-check arbitraries: random strings with marks, joiners and mixed scripts.

import fc from 'fast-check';

const pieces = [
  // Latin, with precomposed and combining accents
  'a',
  'e',
  'i',
  'Ở',
  'ß',
  '́',
  '̣',
  '̂',
  // Greek and Cyrillic
  'ά',
  'Ω',
  'б',
  'ї',
  // Devanagari: consonants, nukta, virama, vowel signs, a vowel, signs
  'क',
  'ष',
  'र',
  '़',
  '्',
  'ि',
  'े',
  'ु',
  'अ',
  'ं',
  'ँ',
  '।',
  // Bengali
  'ক',
  'ষ',
  '্',
  'ি',
  'ো',
  'য',
  // Tamil
  'க',
  'ஷ',
  '்',
  'ெ',
  'ா',
  'ஸ',
  // Joiners, selectors and controls
  '‍',
  '‌',
  '️',
  '­',
  ' ',
  ' ',
  '\n',
  '\r\n',
  '\t',
  // Emoji, CJK, Arabic, a digit, punctuation
  '👩',
  '🏽',
  '中',
  'ب',
  '1',
  ',',
  '-',
  '(',
];

/** A random string of up to `maxLength` pieces. */
export function mixedText(maxLength = 30): fc.Arbitrary<string> {
  return fc.string({ unit: fc.constantFrom(...pieces), maxLength });
}
