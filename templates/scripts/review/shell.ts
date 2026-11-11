/** Thin wrapper over spawnSync so every command failure carries its stderr. */

import { spawnSync } from "node:child_process"

export type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export function runAllowingFailure(
  command: string[],
  cwd?: string,
  maxBuffer?: number,
): CommandResult {
  const [file, ...args] = command
  const result = spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    ...(maxBuffer === undefined ? {} : { maxBuffer }),
  })
  if (result.error) throw result.error
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

/** Returns stdout without its trailing newline. Throws on a non-zero exit. */
export function run(
  command: string[],
  cwd?: string,
  maxBuffer?: number,
): string {
  const result = runAllowingFailure(command, cwd, maxBuffer)
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim()
    throw new Error(
      `\`${command.join(" ")}\` exited with ${result.exitCode}: ${detail}`,
    )
  }
  return result.stdout.trimEnd()
}
