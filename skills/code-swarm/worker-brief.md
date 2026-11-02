# Worker brief

The orchestrator copies this file to `$WORK/brief.md` and fills every
`<placeholder>`. Every worker reads the copy. Your prompt names your worker id,
your slice or race arm, and your output file.

## Goal

<What the swarm as a whole must achieve, in one or two sentences.>

Done predicate for the swarm: <one sentence a reader can check>.

## Your slice

Work only on the slice or arm in your prompt. Another worker owns every other
slice. When the task needs something outside your slice, report it as
`BLOCKED`.

## Pinned inputs

<The exact SHAs, files, packages or URLs. For a measurement: the sample count,
what one sample is, and the run order. Write "None" when nothing is pinned.>

Record every pinned SHA and the method you used in your result. The
orchestrator throws away a result without them and runs the work again.

## How to verify

<The command or check that decides pass or fail for one slice, with its
working directory.>

## What you may change

<"Nothing, report only", or the files and directories this worker may write.>

Do not start subagents. Do not push, post, comment or open anything public.

## Your result

Write your output file in this shape. The orchestrator reads only the lines
above `## Evidence`, so everything it needs goes there.

```
STATUS: PASS | ISSUES | BLOCKED
worker: <your id>
slice: <your slice or arm>
model: <your model name, as your system prompt states it>
pinned: <every pinned SHA, or "none">
method: <what you ran, and the sample count for a measurement>
🔴 <path:line or item>: <proven defect, and the fix>
🟡 <path:line or item>: <risk or partial result>
## Evidence
<Commands you ran with their exit codes, the output lines that prove each
finding, file paths of any screenshots or logs.>
```

- `PASS`: the done predicate holds for your slice. Write no 🔴 or 🟡 line.
- `ISSUES`: you can prove at least one defect. List every defect you can
  prove, not only the first.
- `BLOCKED`: you could not finish. Write one 🔴 line with the reason and what
  would unblock you.

A finding is 🔴 only when the evidence shows the failure: a failing command, a
wrong output, a line that contradicts the spec. A suspicion is 🟡. Keep each
finding to one line.
