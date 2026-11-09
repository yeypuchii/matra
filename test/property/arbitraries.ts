// fast-check arbitraries: random strings with marks, joiners and mixed scripts.

import fc from 'fast-check';

const pieces = [
  // Latin, with precomposed and combining accents
  'a',
  'e',
  'i',
  'Ở',
  'ß',
  '\u0301',
  '\u0323',
  '\u0302',
  // Greek and Cyrillic
  'ά',
  'Ω',
  'б',
  'ї',
  // Devanagari: consonants, nukta, virama, vowel signs, a vowel, signs
  'क',
  'ष',
  'र',
  '\u093c',
  '\u094d',
  '\u093f',
  '\u0947',
  '\u0941',
  'अ',
  '\u0902',
  '\u0901',
  '।',
  // Bengali
  'ক',
  'ষ',
  '\u09cd',
  '\u09bf',
  '\u09cb',
  'য',
  // Tamil
  'க',
  'ஷ',
  '\u0bcd',
  '\u0bc6',
  '\u0bbe',
  'ஸ',
  // Joiners, selectors and controls
  '\u200d',
  '\u200c',
  '\ufe0f',
  '\u00ad',
  ' ',
  '\u00a0',
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
