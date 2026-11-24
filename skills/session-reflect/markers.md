# Status markers

How `h2xd:session-reflect` handles the markers 🟡 and ⚪. A 🟡 needs attention.
A ⚪ is optional and needs none.

## Ask per hit

For each hit of the status markers lens, ask in the step 4 call. The options
are keep the marker, move 🟡 to ⚪, or move ⚪ to 🟡.

A move is a lesson. Route it up the ladder to the check or rule that rated the
item. A script that sets the severity gets a test. A skill that sets it gets a
sharper rule.

## Hide ⚪

When the user asked to stop seeing ⚪ items, offer one feedback memory in step
4. After a yes, write it:

- It says that agents leave ⚪ lines out of every status list.
- It holds the user's words and the reason.
- It updates an existing memory on this topic, and does not add a second one.

Done when every hit has the user's answer and a yes wrote the memory.
