# Create a note

A user saves a titled note from the browser or the CLI, cancels an unfinished draft, and finds the saved note again from a second view.

## Sub-features

- `create-open` opens a blank editor from each browser entry point.
- `create-save` persists a title and body.
- `create-cancel` discards an unfinished browser draft.
- `create-cli` creates the same note shape from the terminal.

## How a user gets to it

- Choose the `New note` button in the browser toolbar.
- Press `n` in the browser while focus is outside an editable field.
- Run `notes create --title <title> --body <body>` in a terminal.

## Driving it with control-notes

Preconditions:

- Notes is healthy at `http://127.0.0.1:4173`.
- No note is titled `Release checklist`.
- `control-notes doctor` reports the expected URL and disposable data directory.

- **Open editor.** Choose `New note`. Run `control-notes browser click --role button --name "New note"`. A form named `Note editor` appears with focus in the `Title` textbox.
- **Enter content.** Type the title and body. Run `control-notes browser fill --role textbox --name "Title" --value "Release checklist"` and `control-notes browser fill --role textbox --name "Body" --value "Tag and publish"`. The `Save note` button becomes enabled.
- **Save note.** Choose `Save note`. Run `control-notes browser click --role button --name "Save note"`. A status named `Note saved` appears and the heading reads `Release checklist`.
- **Confirm persistence.** Return to the note list and reopen the note. Run `control-notes browser click --role link --name "All notes"` and `control-notes browser click --role link --name "Release checklist"`. The editor shows both saved values.
- **Cancel draft.** Open a new note, enter `Discard me`, and choose `Cancel`. Run `control-notes browser click --role button --name "New note"`, `control-notes browser fill --role textbox --name "Title" --value "Discard me"`, and `control-notes browser click --role button --name "Cancel"`. The note list returns and has no `Discard me` link.
- **CLI entry.** Create a second note. Run `control-notes cli -- notes create --title "CLI note" --body "Created from terminal" --format json`. Exit code `0` and stdout contain the new note ID and title.
- **Proof.** Reopen both saved notes from `All notes`. Run `control-notes browser snapshot --aria --path artifacts/$RUN_ID/create-note/list.aria.txt` and `control-notes browser screenshot --path artifacts/$RUN_ID/create-note/list.png`. The artifacts show `Release checklist` and `CLI note`.

## Gotchas

- When a textbox has focus, `n` types the letter and opens no editor.
- Titles are trimmed on save. Assert the rendered title, not the draft input value.
- A save status alone is not proof. Reopen the note from the list.
- Remove `Release checklist` and `CLI note` during cleanup, but keep their proof artifacts.
