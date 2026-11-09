import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import pkg from '../../package.json' with { type: 'json' };
import { quote } from '../check/check.ts';
import { check, type Finding, type FontStack, loadFonts } from '../index.ts';

export interface CliIO {
  out: (text: string) => void;
  err: (text: string) => void;
}

/** Exit codes: 0 no findings, 1 findings, 2 usage error. */
export type ExitCode = 0 | 1 | 2;

const USAGE = `Usage:
  matra check --font <file> [--font <file> ...] --lang <tag> (--text <string> | --file <path>) [--json]
  matra --help
  matra --version

check: find text that will not show correctly in the fonts.
  --font <file>    A TTF, OTF, TTC or WOFF2 file. Repeat it for a font stack: the first is tried first.
  --lang <tag>     A BCP 47 language tag, for example hi, ta or en.
  --text <string>  The text to check.
  --file <path>    A UTF-8 file with one string on each line. Each line is checked on its own.
  --json           Print the result as JSON.

Exit code 0: no findings. Exit code 1: findings. Exit code 2: usage error.
`;

class UsageError extends Error {}

export async function run(argv: readonly string[], io: CliIO): Promise<ExitCode> {
  const [command, ...rest] = argv;
  switch (command) {
    case '--help':
    case '-h':
      io.out(USAGE);
      return 0;
    case '--version':
    case '-v':
      io.out(`${pkg.version}\n`);
      return 0;
    case undefined:
      io.err(USAGE);
      return 2;
    case 'check':
      try {
        return await runCheck(rest, io);
      } catch (error) {
        if (!(error instanceof UsageError)) throw error;
        io.err(`matra: ${error.message}\nRun \`matra --help\` for the usage.\n`);
        return 2;
      }
    default:
      io.err(`matra: unknown command "${command}"\n\n${USAGE}`);
      return 2;
  }
}

interface Result {
  /** The line in the file, from 1; 1 for --text. */
  line: number;
  text: string;
  findings: Finding[];
}

async function runCheck(args: string[], io: CliIO): Promise<ExitCode> {
  let values: {
    font?: string[];
    lang?: string;
    text?: string;
    file?: string;
    json?: boolean;
    help?: boolean;
  };
  try {
    ({ values } = parseArgs({
      args,
      options: {
        font: { type: 'string', multiple: true },
        lang: { type: 'string' },
        text: { type: 'string' },
        file: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  if (values.help) {
    io.out(USAGE);
    return 0;
  }
  if (!values.font || values.font.length === 0) throw new UsageError('give at least one --font.');
  if (!values.lang) throw new UsageError('give --lang, a BCP 47 language tag.');
  if (values.text === undefined && values.file === undefined) {
    throw new UsageError('give --text or --file.');
  }
  if (values.text !== undefined && values.file !== undefined) {
    throw new UsageError('give --text or --file, not both.');
  }

  const fonts = await loadFontFiles(values.font);
  const strings =
    values.text !== undefined ? [values.text] : splitLines(await readText(values.file as string));

  const lang = values.lang;
  const results: Result[] = [];
  for (const [i, text] of strings.entries()) {
    let findings: Finding[];
    try {
      findings = check(text, { fonts, lang });
    } catch (error) {
      if (error instanceof RangeError || error instanceof TypeError) {
        throw new UsageError(error.message.replace(/^matra: /, ''));
      }
      throw error;
    }
    if (findings.length > 0) results.push({ line: i + 1, text, findings });
  }
  const count = results.reduce((n, r) => n + r.findings.length, 0);

  if (values.json) {
    io.out(`${JSON.stringify({ strings: strings.length, findings: count, results }, null, 2)}\n`);
  } else {
    io.out(report(results, strings.length, count, values.file !== undefined));
  }
  return count > 0 ? 1 : 0;
}

async function loadFontFiles(paths: string[]): Promise<FontStack> {
  const bytes: Uint8Array[] = [];
  for (const file of paths) {
    try {
      bytes.push(new Uint8Array(await readFile(file)));
    } catch (error) {
      throw new UsageError(`cannot read the font ${file}: ${(error as Error).message}`);
    }
  }
  try {
    return await loadFonts(bytes);
  } catch (error) {
    // "font 1 is not a font file" → name the file.
    const message = (error as Error).message.replace(/^matra: /, '');
    const named = message.replace(/^font (\d+)/, (_, i: string) => `--font ${paths[Number(i)]}`);
    throw new UsageError(named);
  }
}

async function readText(file: string): Promise<string> {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    throw new UsageError(`cannot read ${file}: ${(error as Error).message}`);
  }
}

/** The lines of a file: split at LF or CRLF; a newline at the end does not start a new line. */
function splitLines(content: string): string[] {
  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function report(results: Result[], strings: number, count: number, fromFile: boolean): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (count === 0) return `No findings in ${plural(strings, 'string')}.\n`;
  let out = '';
  for (const r of results) {
    const where = fromFile ? `line ${r.line}: ` : '';
    out += `${where}${quote(r.text, 0, r.text.length)}\n`;
    for (const f of r.findings) {
      const font = f.font === undefined ? '' : ` (font ${f.font})`;
      out += `  ${f.code} ${f.start}–${f.end}${font}: ${f.message}\n`;
    }
  }
  out += `\n${plural(count, 'finding')} in ${results.length} of ${plural(strings, 'string')}.\n`;
  return out;
}
