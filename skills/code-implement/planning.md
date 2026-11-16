# Scout and split

Start one scout on the cheapest model, such as Haiku, through the CLI's
subagent tool, such as Agent. Give it the paths to `ticket.md` and
[`scout.md`](scout.md). It writes `$WORK/map.md`. Then group the criteria:

```sh
node scripts/implement.ts split $WORK/map.md --criteria <count> --out $WORK/split.md
```

## Read the split verdict

The command writes `$WORK/split.md` and prints one
verdict. Act on it as follows:

- `single`: one build worker gets every criterion.
- `split`: use the build workers in `split.md`. Do not ask.
- `ask`: the scout was unsure of a criterion. Show `split.md` and ask with
  clickable options, through the CLI's question tool, such as AskUserQuestion.
  The options are accept the split, one build worker, or name the files. For
  named files, put them in `map.md` and run the command again.

A `## Step 5 checks` section in `split.md` lists the criteria that only say
the checks pass. They get no build worker. Run them in step 5.
