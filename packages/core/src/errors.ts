/** Stable CLI exit codes by error class. */
export const ExitCode = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  NOT_FOUND: 3,
  CONFLICT: 4,
  STORE: 5,
  LOCK: 6,
  IO: 7,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export class CliError extends Error {
  readonly exitCode: ExitCodeValue;

  constructor(message: string, exitCode: ExitCodeValue = ExitCode.GENERIC) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function classifyError(err: unknown): { message: string; exitCode: ExitCodeValue } {
  if (err instanceof CliError) {
    return { message: err.message, exitCode: err.exitCode };
  }
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";

  if (name === "StoreLockError" || /store lock/i.test(message)) {
    return { message, exitCode: ExitCode.LOCK };
  }
  if (name === "StoreCorruptError" || /corrupt|invalid Agent Wallclock store/i.test(message)) {
    return { message, exitCode: ExitCode.STORE };
  }
  if (/not found/i.test(message)) {
    return { message, exitCode: ExitCode.NOT_FOUND };
  }
  if (/already open|already in use|Cannot delete/i.test(message)) {
    return { message, exitCode: ExitCode.CONFLICT };
  }
  if (/Usage:|Missing |required|Unknown command|Unknown .* subcommand|Invalid duration|must be a positive/i.test(message)) {
    return { message, exitCode: ExitCode.USAGE };
  }
  if (/Could not read|Failed to save|EACCES|ENOENT|EPERM/i.test(message)) {
    return { message, exitCode: ExitCode.IO };
  }
  return { message, exitCode: ExitCode.GENERIC };
}
