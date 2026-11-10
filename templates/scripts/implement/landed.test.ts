import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  planCleanup,
  uncommittedBlocker,
  unlandedCommits,
  workerBranchName,
  worktreeBlocker,
} from "./landed.ts"

const SHA_A = "a".repeat(40)
const SHA_B = "b".repeat(40)
const PATH = "/repo.feat-1-x-w5"
const BRANCH = "feat/1-x-w5"

describe("workerBranchName", () => {
  test("joins the ticket branch and the worker id", () => {
    expect(workerBranchName("feat/1-x", "5")).toBe("feat/1-x-w5")
  })
})

describe("unlandedCommits", () => {
  test("names the commits that git cherry marks with a plus", () => {
    expect(unlandedCommits(`- ${SHA_A}\n+ ${SHA_B}\n`, "")).toEqual([SHA_B])
  })

  test("is empty when every commit landed or there is none", () => {
    expect(unlandedCommits(`- ${SHA_A}\n- ${SHA_B}\n`, "")).toEqual([])
    expect(unlandedCommits("", "")).toEqual([])
  })

  test("counts a plus commit as landed when the ticket log names it in a cherry-pick trailer", () => {
    const log = `resolve\n\n(cherry picked from commit ${SHA_A})\n`
    expect(unlandedCommits(`+ ${SHA_A}\n+ ${SHA_B}\n`, log)).toEqual([SHA_B])
  })

  test("does not count a trailer that names another commit", () => {
    const log = `x\n\n(cherry picked from commit ${SHA_B})\n`
    expect(unlandedCommits(`+ ${SHA_A}\n`, log)).toEqual([SHA_A])
  })
})

const facts = {
  id: "5",
  workerBranch: BRANCH,
  path: PATH,
  branchExists: false,
  pathExists: false,
  worktrees: [{ path: "/repo", branch: "feat/1-x" }],
}

describe("worktreeBlocker", () => {
  test("allows a fresh branch and path", () => {
    expect(worktreeBlocker(facts)).toBe(undefined)
  })

  test("sends an existing branch or registered worktree to cleanup", () => {
    const message = `${BRANCH} or ${PATH} exists. Run \`node scripts/implement.ts cleanup 5\` first`
    expect(worktreeBlocker({ ...facts, branchExists: true })).toBe(message)
    expect(
      worktreeBlocker({
        ...facts,
        pathExists: true,
        worktrees: [...facts.worktrees, { path: PATH }],
      }),
    ).toBe(message)
  })

  test("tells the user to remove a leftover folder that git does not know", () => {
    expect(worktreeBlocker({ ...facts, pathExists: true })).toBe(
      `${PATH} exists and is not a worktree of ${BRANCH}. Remove the folder.`,
    )
  })
})

describe("planCleanup", () => {
  test("removes the registered worktree of the branch and checks the commits", () => {
    expect(
      planCleanup({
        ...facts,
        branchExists: true,
        worktrees: [...facts.worktrees, { path: PATH, branch: BRANCH }],
      }),
    ).toEqual({ kind: "go", checkLanded: true, removeWorktree: PATH })
  })

  test("refuses a worktree at the worker path that is on another branch or detached", () => {
    const message = `${PATH} is not on ${BRANCH}, check it by hand`
    for (const entry of [{ path: PATH }, { path: PATH, branch: "other" }]) {
      expect(
        planCleanup({
          ...facts,
          branchExists: true,
          worktrees: [...facts.worktrees, entry],
        }),
      ).toEqual({ kind: "refuse", message })
    }
  })

  test("skips the commit check and removes nothing when only a folder is left", () => {
    expect(planCleanup(facts)).toEqual({
      kind: "go",
      checkLanded: false,
      removeWorktree: undefined,
    })
  })

  test("refuses a registered worktree whose branch is already gone", () => {
    expect(
      planCleanup({
        ...facts,
        worktrees: [...facts.worktrees, { path: PATH, branch: BRANCH }],
      }),
    ).toEqual({
      kind: "refuse",
      message: `${PATH} has no branch ${BRANCH}, check it and run git worktree remove --force ${PATH}`,
    })
  })
})

describe("uncommittedBlocker", () => {
  test("allows a clean worktree", () => {
    expect(uncommittedBlocker(PATH, "")).toBe(undefined)
    expect(uncommittedBlocker(PATH, "\n")).toBe(undefined)
  })

  test("lists the files that are not committed and names the forced removal", () => {
    expect(uncommittedBlocker(PATH, "?? test-output.log\n M package-lock.json\n")).toBe(
      `${PATH} has files that are not committed: ?? test-output.log, M package-lock.json. Check them, then run git worktree remove --force ${PATH}`,
    )
  })
})
