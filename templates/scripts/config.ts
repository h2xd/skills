/**
 * The repo's agents.config.json, merged over the defaults below.
 *
 * Every repo-specific value the scripts need lives in that one file, so the
 * scripts themselves stay identical across repos and `/h2xd:setup` can update
 * them without a merge. The closed sets in `commits` are closed on purpose:
 * widening one takes a decision record, not a quiet edit.
 */

import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

export type GlossaryConfig = {
  /** Bundle-relative path, such as "glossary/project.md". */
  path: string
  /** `**Field:**` lines every `###` entry must carry. */
  requiredFields: string[]
}

export type Config = {
  docs: {
    /** Repo-relative directory of the OKF bundle. */
    root: string
    /** Bundle-relative directory of the decision records. */
    decisions: string
    glossaries: GlossaryConfig[]
    /**
     * Decision records numbered at or above this must cite their tracker issue
     * as a `sources` entry with an `issue-<n>` id. `null` turns the check off.
     */
    decisionIssueRequiredFrom: number | null
  }
  commits: {
    types: string[]
    scopes: string[]
    subjectMax: number
    maxBodyParagraphs: number
  }
  pullRequests: {
    /** The keyword every PR body opens with, one line per ticket. */
    closingKeyword: string
  }
  /** Read by `review.ts fleet`, which picks the h2xd:review-pr reviewers. */
  review: {
    /** Fewer files and fewer lines than this is a small change: two reviewers. */
    small: { files: number; lines: number }
    /** Fewer than this is a middle change. More is large: all five, after a question. */
    middle: { files: number; lines: number }
    /** Path prefixes, such as "migrations/", that make any change critical: all five. */
    criticalPaths: string[]
  }
  /** Read by `implement.ts split`, which groups a ticket for h2xd:code-implement. */
  implement: {
    /** The most build workers that run at once. 1 turns the split off. */
    maxWorkers: number
  }
  /**
   * Commands a fresh worktree needs before it can typecheck and run the tests, each as argv.
   * review-pr, review-fix, code-arena and the build workers of code-implement run them.
   */
  worktreeSetup: string[][]
  /**
   * Read by the h2xd:prove-tests skill, which passes the commands to
   * `prove-tests.sh`. The shell runner cannot import this file.
   */
  mutation: {
    enabled: boolean
    /** "sh" applies the agent's patches with prove-tests.sh; "native" runs `nativeCommand`. */
    runner: "sh" | "native"
    testCommand: string
    /** Run before the tests on each mutant; a failure marks it invalid. */
    checkCommand: string | null
    /** Run once in the throwaway worktree, such as an install. */
    setupCommand: string | null
    /** A mutation tool's command; `{ranges}` becomes `file:start-end,...`, `{files}` the paths. */
    nativeCommand: string | null
    linesPerMutant: number
    minMutants: number
    maxMutants: number
    /** The largest share of the mutants one file may get. */
    maxFileShare: number
    timeoutFactor: number
    /** Globs never mutated, on top of tests, generated code, types, config and docs. */
    exclude: string[]
  }
}

export const DEFAULTS: Config = {
  docs: {
    root: "docs",
    decisions: "decisions",
    glossaries: [
      { path: "glossary/project.md", requiredFields: ["Meaning"] },
      { path: "glossary/technical.md", requiredFields: ["Meaning"] },
    ],
    decisionIssueRequiredFrom: 1,
  },
  commits: {
    types: ["feat", "fix", "docs", "refactor", "test", "chore"],
    scopes: ["tooling"],
    subjectMax: 72,
    maxBodyParagraphs: 2,
  },
  pullRequests: { closingKeyword: "Closes" },
  review: {
    small: { files: 10, lines: 500 },
    middle: { files: 20, lines: 1000 },
    criticalPaths: [],
  },
  implement: { maxWorkers: 3 },
  worktreeSetup: [["npm", "install"]],
  mutation: {
    enabled: true,
    runner: "sh",
    testCommand: "npm test",
    checkCommand: null,
    setupCommand: "npm install",
    nativeCommand: null,
    linesPerMutant: 10,
    minMutants: 3,
    maxMutants: 40,
    maxFileShare: 0.34,
    timeoutFactor: 3,
    exclude: [],
  },
}

export const CONFIG_FILE = "agents.config.json"

export const REPO_ROOT = resolve(import.meta.dirname, "..")

type Section = Exclude<keyof Config, "worktreeSetup">

/** What agents.config.json may hold: any section, any key within it. */
type Overrides = { [K in Section]?: Partial<Config[K]> } & {
  worktreeSetup?: string[][]
}

export function mergeConfig(overrides: Overrides): Config {
  return {
    docs: { ...DEFAULTS.docs, ...overrides.docs },
    commits: { ...DEFAULTS.commits, ...overrides.commits },
    pullRequests: { ...DEFAULTS.pullRequests, ...overrides.pullRequests },
    review: { ...DEFAULTS.review, ...overrides.review },
    implement: { ...DEFAULTS.implement, ...overrides.implement },
    worktreeSetup: overrides.worktreeSetup ?? DEFAULTS.worktreeSetup,
    mutation: { ...DEFAULTS.mutation, ...overrides.mutation },
  }
}

function loadConfig(): Config {
  const path = join(REPO_ROOT, CONFIG_FILE)
  if (!existsSync(path)) return DEFAULTS
  try {
    return mergeConfig(JSON.parse(readFileSync(path, "utf8")))
  } catch (error) {
    throw new Error(`${CONFIG_FILE} is not valid JSON: ${error}`)
  }
}

export const config = loadConfig()
