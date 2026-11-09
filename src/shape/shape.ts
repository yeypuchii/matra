import type { Feature, GlyphInfo, GlyphPosition } from 'harfbuzzjs';
import type { HB } from '../font/harfbuzz.ts';
import { itemize } from '../font/runs.ts';
import { NEUTRAL_SCRIPT } from '../font/script.ts';
import { internals, type LoadedFont, type StackInternals } from '../font/stack.ts';
import { assertOptions, assertText, checkLang } from '../options.ts';
import type { Glyph, GlyphRun, ShapeOptions } from '../types.ts';

/** A glyph with the HarfBuzz glyph flags (`GlyphFlag.UNSAFE_TO_BREAK`, ...). */
export interface ShapedGlyph extends Glyph {
  flags: number;
}

/** The glyphs of one item: one font and one script, in HarfBuzz output order. */
export interface ShapedItem {
  font: number;
  script: string;
  start: number;
  end: number;
  glyphs: ShapedGlyph[];
}

/**
 * Shape `text.slice(from, to)` as a text of its own: HarfBuzz sees no context outside it, and
 * its start and end are the beginning and the end of the text. Offsets in the result are
 * offsets into `text`.
 */
export function shapeItems(
  stack: StackInternals,
  text: string,
  lang: string,
  features: Feature[] | undefined,
  from = 0,
  to: number = text.length,
): ShapedItem[] {
  const context = from === 0 && to === text.length ? text : text.slice(from, to);
  if (context.length === 0) return [];
  const { hb, fonts } = stack;
  const buffer = new hb.Buffer();
  const result: ShapedItem[] = [];
  for (const item of itemize(fonts, context, lang)) {
    buffer.clearContents();
    buffer.addText(context, item.start, item.end - item.start);
    let flags = 0;
    if (item.start === 0) flags |= hb.BufferFlag.BOT;
    if (item.end === context.length) flags |= hb.BufferFlag.EOT;
    buffer.setFlags(flags);
    if (item.script !== NEUTRAL_SCRIPT) buffer.setScript(item.script);
    buffer.setLanguage(lang);
    buffer.guessSegmentProperties();
    hb.shape((fonts[item.font] as LoadedFont).font, buffer, features);

    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    const glyphs: ShapedGlyph[] = new Array(infos.length);
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i] as GlyphInfo;
      const pos = positions[i] as GlyphPosition;
      glyphs[i] = {
        id: info.codepoint,
        cluster: info.cluster + from,
        xAdvance: pos.xAdvance,
        yAdvance: pos.yAdvance,
        xOffset: pos.xOffset,
        yOffset: pos.yOffset,
        flags: info.flags,
      };
    }
    result.push({
      font: item.font,
      script: item.script,
      start: item.start + from,
      end: item.end + from,
      glyphs,
    });
  }
  return result;
}

/** Parse feature strings in HarfBuzz syntax, for example `'liga=0'` or `'+kern'`. */
export function parseFeatures(hb: HB, features: unknown): Feature[] | undefined {
  if (features === undefined) return undefined;
  if (!Array.isArray(features)) {
    throw new TypeError('matra: `features` must be an array of strings, for example ["liga=0"].');
  }
  return features.map((feature: unknown) => {
    const parsed = typeof feature === 'string' ? hb.Feature.fromString(feature) : undefined;
    if (!parsed) {
      throw new TypeError(`matra: ${JSON.stringify(feature)} is not a valid OpenType feature.`);
    }
    return parsed;
  });
}

/**
 * Shape the text with HarfBuzz. Returns one run for each group of neighbor graphemes that use
 * the same font. Positions are in font units; multiply by size / upem for pixels.
 */
export function shape(text: string, options: ShapeOptions): GlyphRun[] {
  assertText(text, 'shape');
  assertOptions(options, 'shape');
  const stack = internals(options.fonts);
  const lang = checkLang(options.lang);
  const features = parseFeatures(stack.hb, options.features);

  const runs: GlyphRun[] = [];
  for (const item of shapeItems(stack, text, lang, features)) {
    const glyphs = item.glyphs.map(({ flags: _, ...glyph }) => glyph);
    const last = runs.at(-1);
    if (last && last.font === item.font) {
      last.end = item.end;
      last.glyphs.push(...glyphs);
    } else {
      runs.push({ font: item.font, start: item.start, end: item.end, glyphs });
    }
  }
  return runs;
}
