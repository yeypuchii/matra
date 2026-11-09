import { describe, expect, it } from 'vitest';
import * as matra from '../src/index.ts';

describe('public API', () => {
  it('exports exactly the documented functions', () => {
    expect(Object.keys(matra).sort()).toEqual([
      'check',
      'fit',
      'loadFonts',
      'measure',
      'segment',
      'shape',
      'wrap',
    ]);
  });

  it('rejects a font stack that does not come from loadFonts, in every function', () => {
    const fonts = { length: 1 } as matra.FontStack;
    const calls: [string, () => unknown][] = [
      ['check', () => matra.check('a', { fonts, lang: 'en' })],
      ['shape', () => matra.shape('a', { fonts, lang: 'en' })],
      ['measure', () => matra.measure('a', { fonts, lang: 'en', size: 16 })],
      ['wrap', () => matra.wrap('a', { fonts, lang: 'en', size: 16, width: 100 })],
      [
        'fit',
        () =>
          matra.fit('a', {
            fonts,
            lang: 'en',
            box: { width: 100, height: 100 },
            minSize: 8,
            maxSize: 32,
          }),
      ],
    ];
    for (const [name, call] of calls) {
      expect(call, name).toThrow(/FontStack from loadFonts/);
    }
  });
});
