# Read the split verdict

`node scripts/implement.ts split` writes `$WORK/split.md` and prints one
verdict. Act on it as follows:

- `single`: one build worker gets every criterion.
- `split`: use the build workers in `split.md`. Do not ask.
- `ask`: the scout was unsure of a criterion. Show `split.md` and ask with
  clickable options, through the CLI's question tool, such as AskUserQuestion.
  The options are accept the split, one build worker, or name the files. For
  named files, put them in `map.md` and run the command again.
