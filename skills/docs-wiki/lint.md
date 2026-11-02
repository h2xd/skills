# Lint

The script catches broken links and a drifted index. It cannot catch a page
that still says 30 seconds after the code changed to 10. Steps 5 and 6 are
where you catch that.

1. Run `node scripts/lint-docs.ts` and fix every error.
2. Act on each `note:` line it prints:
   - A link to a page not written yet: write the page, or remove the link.
   - A page past `stale_after`: check it again against its sources.
   - A link to a superseded record: point it at the successor.
3. Run `node scripts/find-docs.ts --orphans`. Link each orphan from a related
   page. Leave it alone when the index is the right way in.
4. Run `node scripts/find-docs.ts --status draft`. Read each page's
   `generated.at` and list the pages where it is more than a month old.
5. Compare each page that links code or config against every file it links.
   Compare each page against the pages it links. Read the code before you
   trust a page about the code. No script does this step.
6. Read both glossaries against the code. Look for three things:
   - a `**Code:**` path that moved,
   - a term the code now calls something else,
   - a term that pages use but the glossary does not define.
7. Report the findings, with the list of pages you compared. Fix the
   mechanical findings. Ask before you change what a page claims.
8. Add a `**Lint**` entry to `docs/log.md`.

Done when `node scripts/lint-docs.ts` exits 0, the report names each page you
compared in step 5, with or without a finding, and the log has the entry.

Report one line per finding, worst first:

```
🔴 <page>: <a claim the code contradicts, and the fix you propose>
🟡 <page>: <stale, an old draft, an orphan, or a glossary gap>
🟢 <page>: <compared, no finding>
```
