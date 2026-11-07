# Worker brief

You build or check one thing for one call. Your agent file says how. This
brief gives the frame.

The words are in `../design-setup/words.md`, relative to the skill folder.
The chair gives you its absolute path.

1. Read your task copy, `tasks/<call id>.md`. It holds every line of the
   call except `hypothesis`. It has no hypothesis on purpose. Do not guess one.
2. Read the header the chair put on top of the copy:
   - `answer` is the absolute path of your answer file.
   - `committee folder` is the absolute path of the committee folder.
   - `dev server` is the base URL, or none.
   - `design pages` is the design pages folder, or none.
3. Read every path on a `material:` line. It is the absolute path of the
   answer to an earlier call.
4. Use the dev server in the header. Never start a dev server.
5. Write scripts, such as a screenshot script, in the committee folder, not
   in the repo.
6. Save screenshots to `<committee folder>/shots/<call id>-*.png`.
7. Write the answer file at the `answer` path. Give the result, the evidence,
   and what you did not do. A build answer names its screenshots. Keep to the
   length `calls.md` gives.
8. End with `ANSWER DONE`.

You call nobody. When the task needs a judgement, say so in the answer and
leave it to the caller.
