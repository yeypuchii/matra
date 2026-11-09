// The Unicode Script property of a code point (UAX #24), from the regular expression engine of
// the runtime, so it follows the Unicode version of the runtime.

/** Common (Zyyy), Inherited (Zinh) and Unknown (Zzzz) take the script of the text around them. */
export const NEUTRAL_SCRIPT = 'Zyyy';

// ISO 15924 codes of the Unicode scripts. The common ones first, because the first match wins
// and most text is in them. A code that the runtime does not know is skipped.
const CODES = `Latn Cyrl Grek Deva Beng Taml Arab Hebr Thai Hani Hira Kana Hang Gujr Guru Orya Telu
Knda Mlym Sinh Mymr Khmr Laoo Tibt Geor Armn Ethi Thaa Syrc Mong Bopo Cher Cans Tfng Olck Nkoo Vaii
Java Bali Sund Tavt Lana Tale Talu Cham Yiii Lisu Adlm Rohg Gong Gonm Wcho Nagm Mtei Lepc Limb Sylo
Saur Kali Rjng Batk Bugi Buhd Hano Tagb Tglg Copt Glag Goth Ogam Runr Ital Dsrt Shaw Osma Osge Brai
Bamu Mend Kthi Brah Khar Sora Cakm Shrd Takr Sidd Mahj Khoj Sind Mult Gran Tirh Modi Dogr Nand Newa
Bhks Marc Zanb Soyo Diak Kits Hmng Hmnp Mroo Pauc Wara Bass Dupl Ahom Elba Aghb Mani Phli Phlp Prti
Avst Armi Sarb Narb Nbat Palm Hatr Phnx Ugar Xpeo Xsux Egyp Hluw Lina Linb Cprt Cpmn Cari Lyci Lydi
Mand Samr Merc Mero Plrd Sgnw Sogd Sogo Ougr Chrs Elym Yezi Hung Orkh Tang Nshu Kawi Vith Toto Tnsa
Gara Gukh Krai Onao Sunu Todr Tutg Berf Chis Sidt Tayo Tols Medf Maka Perm Phag`.split(/\s+/);

let tests: [code: string, re: RegExp][] | undefined;
const common = /^[\p{Script=Zyyy}\p{Script=Zinh}]$/u;
const cache = new Map<number, string>();

function compile(): [string, RegExp][] {
  const compiled: [string, RegExp][] = [];
  for (const code of CODES) {
    try {
      compiled.push([code, new RegExp(`^\\p{Script=${code}}$`, 'u')]);
    } catch {
      // The runtime has an older Unicode version without this script.
    }
  }
  return compiled;
}

/** The ISO 15924 code of the script of a code point, or `NEUTRAL_SCRIPT`. */
export function scriptOf(codePoint: number): string {
  let code = cache.get(codePoint);
  if (code !== undefined) return code;
  const char = String.fromCodePoint(codePoint);
  code = NEUTRAL_SCRIPT;
  if (!common.test(char)) {
    tests ??= compile();
    for (const [name, re] of tests) {
      if (re.test(char)) {
        code = name;
        break;
      }
    }
  }
  cache.set(codePoint, code);
  return code;
}
