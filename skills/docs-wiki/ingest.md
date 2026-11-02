# Ingest

A new source arrives, such as meeting notes, a spec, a vendor's API
description, an article or a transcript. Fold what it says into the pages, and
keep the source itself as it came.

1. Copy the source verbatim into `docs/references/<slug>.md`. Give it
   frontmatter with `type: Reference`, `title`, `description` and `retrieved`.
   When the original has a URL or a file, point `resource` at it.
   Never edit the copy after this step. A correction is a new ingest.
2. Tell the human the three to five takeaways and the pages they change,
   glossary entries included. Wait for a go-ahead before you edit more than
   one page.
3. Update every affected page. Add the source to the page's `sources` and
   footnote the claims it supports.
   - When the source contradicts a claim, rewrite the claim. Do not append a
     second version.
   - Say in the log entry what the new claim replaced.
4. Send new terms through `h2xd:docs-glossary`. Send a decision the source
   records through `h2xd:docs-adr`.
5. Create a page only when no existing page is the right home. Check first with
   `node scripts/find-docs.ts --search "<words>"`.
6. Update `docs/index.md`. Add an `**Ingest**` entry to `docs/log.md` that names
   every page you touched.
7. Run `node scripts/lint-docs.ts`.

Done when the lint exits 0, the source is in `docs/references/`, and the log
entry names every page touched.
