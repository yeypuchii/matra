// Checks of the arguments of the public functions. Errors start with "matra:".

export function assertText(text: unknown, fn: string): asserts text is string {
  if (typeof text !== 'string') {
    throw new TypeError(`matra: ${fn}() takes a string as its first argument.`);
  }
}

export function assertOptions(options: unknown, fn: string): asserts options is object {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError(`matra: ${fn}() needs an options object.`);
  }
}

const canonical = new Map<string, string>();

/** A valid BCP 47 tag, in canonical form. Throws a RangeError for a tag that is not valid. */
export function checkLang(lang: unknown): string {
  if (typeof lang !== 'string' || lang === '') {
    throw new TypeError('matra: `lang` must be a BCP 47 language tag, for example "hi".');
  }
  let tag = canonical.get(lang);
  if (tag === undefined) {
    try {
      tag = Intl.getCanonicalLocales(lang)[0] ?? lang;
    } catch {
      throw new RangeError(`matra: "${lang}" is not a valid BCP 47 language tag.`);
    }
    canonical.set(lang, tag);
  }
  return tag;
}

/** A finite number above 0. */
export function checkPositive(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`matra: \`${name}\` must be a finite number above 0.`);
  }
  return value;
}
