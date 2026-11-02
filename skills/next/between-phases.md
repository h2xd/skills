# Between phases

A phase is one chunk of work inside a session, such as the grilling, the build
or the review. It ends when the user would say "done with that". Make the
choice below at that boundary. In the middle of a phase, continue, or send the
rest to subagents.

## The five options

| Option | What it does |
|---|---|
| Continue | Stay in the session. Nothing is lost. |
| Clear | Empty the context window with the CLI's clear command, such as `/clear`. |
| `h2xd:session-handoff` | Write a file that a fresh session or another agent reads. |
| Subagent | Send a scoped task to its own context window and read its report. |
| Compact | Summarize this context into a fresh one with the CLI's compact command, such as `/compact`. |

## Ask in order

The first yes wins.

1. **Continue?** Yes when the next phase needs this one word for word, such as
   grilling into spec into tickets. Also yes when the window has room left for
   the next phase.
2. **Clear?** Yes when nothing in this session matters to what comes next.
   Clearing a context that mattered loses the reasons behind the work. The diff
   cannot give them back.
3. **Hand off?** Yes only when the work moves. It moves to another CLI, another
   directory or repo, a colleague, or a side task forked off mid-phase.
4. **Subagent?** Yes when the task runs without the user steering it, such as
   a review that reads a diff and reports.
5. **Otherwise compact.** Pass an instruction that names the next phase, so the
   summary keeps what that phase needs.

Every option but Continue leaves part of this session behind. Pay that cost
only when staying costs more.
