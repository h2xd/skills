# A missing role page

The fixer reads `docs/agents/subagents/fixer.md` in `$WORKTREE`, a page that
`/h2xd:setup` writes. When that page does not exist, start the fixer without
its path. Add this line to the chat summary of step 7 in
[`SKILL.md`](SKILL.md):

```
🟡 docs/agents/subagents/fixer.md: missing, run /h2xd:setup
```
