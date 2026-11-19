# Reply formats

One reply per item, in `$WORK/replies.md`. Keep `<sha>` until step 5 of
`SKILL.md`. Write to `../setup-tone/github-text.md` and `../add-soul/SKILL.md`,
in one or two sentences.

- **fix:** `Fixed in <sha>: <what changed, one sentence>.`
- **mutation fix:** `Fixed in <sha>: <test name> now kills this mutant.`
- **decline:** `Not changed: <reason, citing the file or decision record>.`

End each reply with `Co-Authored-By: <model> <noreply@anthropic.com>`, as in
`## Commits`. Fixes name the fixer's model. Declines name yours.

## What `reply` posts

`review.ts reply` fills `<sha>`, replies on each thread, and posts the `S…`
items as one PR comment, one section per item id. It posts nothing and exits 1
when a `<sha>` would remain or an id is missing.
