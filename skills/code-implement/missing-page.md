# A missing role page

The scout and the build workers read a role page that `/h2xd:setup` writes.
When the page does not exist, start the subagent without its path. Add its
line to the report:

```
🟡 docs/agents/subagents/scout.md: missing, run /h2xd:setup
🟡 docs/agents/subagents/builder.md: missing, run /h2xd:setup
```
