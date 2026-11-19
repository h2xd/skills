# A missing role page

The scout and the build workers read a role page that `/h2xd:setup` writes.
Pass its absolute path in the repo root, because a worktree may not hold it.
The check runs against that path. When the page does not exist there, start
the subagent without its path. Add its line to the report:

```
🟡 docs/agents/subagents/scout.md: missing, run /h2xd:setup
🟡 docs/agents/subagents/builder.md: missing, run /h2xd:setup
```
