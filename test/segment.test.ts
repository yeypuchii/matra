import { describe, expect, it } from 'vitest';
import { type SegmentUnit, segment } from '../src/index.ts';

function parts(text: string, unit: SegmentUnit, lang = 'und'): string[] {
  return segment(text, { lang, unit }).map((s) => text.slice(s.start, s.end));
}

describe('segment: grapheme, word, sentence', () => {
  it('gives extended grapheme clusters', () => {
    expect(parts('👩🏽\u200d💻e\u0301x', 'grapheme', 'en')).toEqual([
      '👩🏽\u200d💻',
      'e\u0301',
      'x',
    ]);
  });

  it('joins a Devanagari conjunct into one grapheme (GB9c), but not a Tamil one', () => {
    expect(parts('क्ष', 'grapheme', 'hi')).toEqual(['क्ष']);
    expect(parts('க்ஷ', 'grapheme', 'ta')).toEqual(['க்', 'ஷ']);
  });

  it('gives words, with the spaces and punctuation between them', () => {
    expect(parts('Hello, world!', 'word', 'en')).toEqual(['Hello', ',', ' ', 'world', '!']);
  });

  it('gives sentences', () => {
    expect(parts('Hi there. How are you?', 'sentence', 'en')).toEqual([
      'Hi there. ',
      'How are you?',
    ]);
  });

  it('gives UTF-16 offsets that cover the text', () => {
    expect(segment('a😀b', { lang: 'en', unit: 'grapheme' })).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 3 },
      { start: 3, end: 4 },
    ]);
  });

  it('returns nothing for empty text', () => {
    for (const unit of ['grapheme', 'word', 'sentence', 'syllable'] as const) {
      expect(segment('', { lang: 'en', unit })).toEqual([]);
    }
  });

  it('rejects bad options', () => {
    // @ts-expect-error: wrong type on purpose.
    expect(() => segment('a', { lang: 'en', unit: 'line' })).toThrow(/unit/);
    expect(() => segment('a', { lang: '??', unit: 'word' })).toThrow(RangeError);
  });
});

describe('segment: syllables in Devanagari (hi, mr)', () => {
  const cases: [string, string[]][] = [
    ['नमस्ते', ['न', 'म', 'स्ते']],
    ['क्षत्रिय', ['क्ष', 'त्रि', 'य']],
    ['हिन्दी', ['हि', 'न्दी']],
    ['कर्म', ['क', 'र्म']],
    ['धर्मक्षेत्रे', ['ध', 'र्म', 'क्षे', 'त्रे']],
    // ज + nukta, decomposed
    [
      '\u0905\u0902\u0917\u094d\u0930\u0947\u091c\u093c\u0940',
      ['\u0905\u0902', '\u0917\u094d\u0930\u0947', '\u091c\u093c\u0940'],
    ],
    ['\u092a\u0922\u093c\u093e\u0908', ['\u092a', '\u0922\u093c\u093e', '\u0908']],
    ['\u0959\u093e', ['\u0959\u093e']], // precomposed ख़
    ['चाँद', ['चाँ', 'द']],
    ['दुःख', ['दुः', 'ख']],
    ['क्', ['क्']], // a dead consonant at the end of a word
    ['क्\u200dष', ['क्\u200dष']], // ZWJ: half form
    ['क्\u200cष', ['क्\u200cष']], // ZWNJ: explicit virama
    ['र्\u200dय', ['र्\u200dय']], // Marathi eyelash ra
    // Vedic accents: anudatta U+0952 and udatta U+0951
    ['अ\u0952ग्निमी\u0951ळे', ['अ\u0952', 'ग्नि', 'मी\u0951', 'ळे']],
    ['◌\u093f', ['◌\u093f']], // a dotted circle as the base
    ['\u00a0\u093f', ['\u00a0\u093f']], // NBSP as the base
    ['है। ॐ', ['है', '।', ' ', 'ॐ']],
    ['नमस्ते, world', ['न', 'म', 'स्ते', ',', ' ', 'w', 'o', 'r', 'l', 'd']],
  ];
  it.each(cases)('%s', (text, expected) => {
    expect(parts(text, 'syllable', 'hi')).toEqual(expected);
  });
});

describe('segment: syllables in Bengali (bn)', () => {
  const cases: [string, string[]][] = [
    ['বাংলা', ['বাং', 'লা']],
    ['ক্ষমা', ['ক্ষ', 'মা']],
    ['স্ত্রী', ['স্ত্রী']],
    ['কৌতুক', ['কৌ', 'তু', 'ক']],
    ['উৎসব', ['উ', 'ৎ', 'স', 'ব']], // khanda ta
    ['রবীন্দ্রনাথ', ['র', 'বী', 'ন্দ্র', 'না', 'থ']],
    // ra + ZWJ + virama + ya: ya-phala, not reph
    ['র\u200d\u09cdযাব', ['র\u200d\u09cdযা', 'ব']],
    ['আমার সোনার', ['আ', 'মা', 'র', ' ', 'সো', 'না', 'র']],
  ];
  it.each(cases)('%s', (text, expected) => {
    expect(parts(text, 'syllable', 'bn')).toEqual(expected);
  });
});

describe('segment: syllables in Tamil (ta)', () => {
  const cases: [string, string[]][] = [
    ['தமிழ்', ['த', 'மி', 'ழ்']],
    ['வணக்கம்', ['வ', 'ண', 'க்க', 'ம்']],
    ['க்ஷ', ['க்ஷ']], // one syllable, two graphemes
    ['ஸ்ரீ', ['ஸ்ரீ']],
    ['\u0b95\u0bca', ['\u0b95\u0bca']], // precomposed two-part vowel sign
    ['\u0b95\u0bc6\u0bbe', ['\u0b95\u0bc6\u0bbe']], // the same, decomposed
    ['அஃது', ['அ', 'ஃ', 'து']], // the aytham is a letter of its own
  ];
  it.each(cases)('%s', (text, expected) => {
    expect(parts(text, 'syllable', 'ta')).toEqual(expected);
  });
});

describe('segment: syllables, other text', () => {
  it('gives a mark with no base as a syllable of its own, unless it ends a grapheme', () => {
    expect(parts('\u093f', 'syllable', 'hi')).toEqual(['\u093f']);
    expect(parts('\u0915\u094d\u093f', 'syllable', 'hi')).toEqual(['\u0915\u094d\u093f']); // one grapheme, never split
    expect(parts('\u0bcdக', 'syllable', 'ta')).toEqual(['\u0bcd', 'க']);
  });

  it('gives graphemes for scripts with no syllable grammar', () => {
    expect(parts('Ở e\u0301', 'syllable', 'vi')).toEqual(['Ở', ' ', 'e\u0301']);
    expect(parts('ગુજરાતી', 'syllable', 'gu')).toEqual(parts('ગુજરાતી', 'grapheme', 'gu'));
  });

  it('keeps a mark from another script with the syllable it attaches to', () => {
    expect(parts('कि\u0301ख', 'syllable', 'hi')).toEqual(['कि\u0301', 'ख']);
  });

  it('keeps a ZWNJ at the end of a syllable with that syllable', () => {
    expect(parts('क\u200cष', 'syllable', 'hi')).toEqual(['क\u200c', 'ष']);
  });
});
