# A missing role page

The fixer reads `docs/agents/subagents/fixer.md`, a page that `/h2xd:setup`
writes. When that page does not exist, start the fixer without its path. Add
this line to the summary:

```
🟡 docs/agents/subagents/fixer.md: missing, run /h2xd:setup
```
