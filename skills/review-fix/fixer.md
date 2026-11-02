# Fixer brief

The fixer applies the planned fixes, and nothing else. It gets this file's
path, `threads.md`, `plan.md`, and `$WORKTREE` as the directory to work in.

## Steps

1. Apply every **fix** item in the order of `plan.md`.
   - The row says which change to make, and which option letter when the
     reviewer offered several.
   - Take a `suggestion` block as written. Change it only when it breaks the
     code around it or the row asks for more. Then make the change the row
     names, and say so in `changes.md`.
   - Leave **decline** items untouched.
2. Follow the agent instructions file and `../code-quality/SKILL.md`.
   - Write no comment that explains the code. Rename or restructure instead.
   - When a fix changes what a page says about the file, update the page in the
     same change. Find the pages with
     `node scripts/find-docs.ts --links-to <path>`.
3. For a **mutation item**, write the missing test through the public
   interface, per the Tests section of `../code-quality/SKILL.md`.
   - Change no production code to kill a mutant. The one exception is deleting
     code the mutant shows is dead.
   - Plant the mutant again. Write it as a unified diff against the working
     tree to `$WORK/mutants/<item id>.patch`.
   - Run the command below, with the `mutation` settings from
     `agents.config.json`. Add `--check`, `--setup` and `--timeout-factor`
     when those settings are set, as `h2xd:prove-tests` does. It must report
     `killed`.
   - When it does not, the test does not pin the behavior yet. Change the test
     and run again.

   ```sh
   sh scripts/prove-tests.sh --mutants $WORK/mutants --only <item id> --test "<testCommand>" --check "<checkCommand>" --setup "<setupCommand>" --timeout-factor <timeoutFactor>
   ```

4. Run the lint, typecheck and test commands the agent instructions file names.
   Run `node scripts/lint-docs.ts` too.
   - Use `--cwd` or an absolute path, never `cd &&`.
   - Fix what your changes broke.
   - Name failures that already exist on the base branch, and leave them.
   - After merging the base branch, run the `worktreeSetup` commands
     first. Otherwise new dependencies fail the typecheck.
5. Leave the changes uncommitted.
6. Write `$WORK/changes.md`:
   - Per item id, the files touched and one sentence on what changed.
   - For a mutation item, the test's name and the `prove-tests.sh` result line.
   - `not applied: <reason>` when a fix turned out wrong or impossible.
   - The checks, with their exit codes.

Done when `changes.md` accounts for every fix item and records the exit code of
each check.
