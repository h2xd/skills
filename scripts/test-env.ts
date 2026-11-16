/** The environment a test passes to git: the caller's, without any `GIT_*` key. */
export function envWithoutGit(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("GIT_")))
}
