export const STALE_COPY = "re-run setup, this copy is older than the skill"

export function isUnknownOption(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ERR_PARSE_ARGS_UNKNOWN_OPTION"
  )
}

export function failStale(script: string, code = 1): never {
  console.error(`${script}: ${STALE_COPY}`)
  process.exit(code)
}
