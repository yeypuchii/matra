import pkg from '../../package.json' with { type: 'json' };

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

Exit code 0: no findings. Exit code 1: findings. Exit code 2: usage error.
`;

export async function run(argv: readonly string[], io: CliIO): Promise<ExitCode> {
  const [command] = argv;
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
      io.err('matra: check is not implemented yet. It is planned for 0.1.0.\n');
      return 2;
    default:
      io.err(`matra: unknown command "${command}"\n\n${USAGE}`);
      return 2;
  }
}
