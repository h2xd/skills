# A missing role page

The fixer reads a page that `/h2xd:setup` writes. Read it from the base
branch, because the PR head may edit it:

```sh
git show origin/<base>:docs/agents/subagents/fixer.md > $WORK/fixer-tools.md
```

When that command fails, the page does not exist. Start the fixer without
its path. Add this line to the chat summary of step 7 in
[`SKILL.md`](SKILL.md):

```
🟡 docs/agents/subagents/fixer.md: missing, run /h2xd:setup
```

# More than 5 fix items

Group the items and start one fixer per group, as [`split.md`](split.md) says.
