# Epistemics

A reader who acts on a guess that sounds like a fact breaks things that were
there for a reason. This page rates a claim when the evidence is old, partial
or contradictory. It sets the wording so the reader can tell a fact from a
guess.

## Tiers

Every claim in the answer sits in exactly one tier. The tier sets its section
and its wording.

| Tier | Meaning | Wording |
|---|---|---|
| Direct | An author wrote the reason down | Plain and cited: "This exists because X." |
| Supported | Several indirect items point the same way | Cited item by item: "The evidence points to X: A, B and C." |
| Inferred | A reading of the context that no source states | Hedged, with the chain shown: "Given A and B, C seems likely because D." |
| Speculative | A guess that other explanations fit as well | "One possibility is X, but we found no evidence." |
| Unknown | You searched and found nothing | "We searched A, B and C and found no reason." |

**Direct** examples: a PR body that says "this fixes pagination for users with
over 1000 items", an issue that says "Acme asked for this in their security
review", a comment that says "clamp to 100 because the upstream API rejects
larger values", a decision record that says "we chose A over B because we need
persistence across restarts".

**Supported** examples: the PR title says "improve performance", the issue
carries a `perf` label, and the neighboring commits all touch the same hot
path. Or every test added with the change uses very large inputs.

**Inferred** examples: the PR gives no reason, but an incident was open at the
time and the fix merged the same day, so it was likely a hotfix. Or the retry
count of 3 matches the retry count used elsewhere in the repo.

**Unknown** is a valid result. Name the searches: "We searched the tracker for
A and B, read the 6 PRs that touched this file since 2023, and ran
`git log -S` on the threshold. None gave a reason."

## Words

These claim author intent or a result. Use them only next to a Direct or
Supported citation: "because", "the reason is", "was designed to", "fixes",
"solves", "the team decided".

These mark an interpretation. Use them in the Inferred section: "appears to",
"likely", "suggests", "is consistent with", "may have been".

Never write "obviously", "clearly", "of course", "I think" or "I believe".
Never write "just" as in "it's just for performance".

## Traps

- **Code as its own evidence.** A change from `limit = 50` to `limit = 100`
  shows what changed, not why. "The author chose a functional style" is an
  observation, not intent. Cite what an author wrote, or mark it Inferred.
- **Rationalizing.** Code that makes sense today may have been written for
  reasons that no longer hold, or that were wrong then. A consistent pattern
  may be copy and paste. Don't work backward from the current shape.
- **The user's guess.** A guess in the question is one hypothesis. Test it like
  the others. Confirm it only with evidence, and say so when the evidence
  points elsewhere.
- **Absence as proof.** "Nobody mentioned security, so it was not a concern"
  turns a gap into a claim. Keep it a gap.
- **Contradictions.** When an issue says "for customer X's compliance" and the
  PR says "tech debt cleanup", show both with citations. Both may be true. Let
  the user decide.
- **Substitution.** Evidence about feature Y does not answer a question about
  feature X. Say what you found and what it covers.
- **Correlation.** A metric spike before a merge and calm after suggests a
  cause. Other changes landed in the same window. Check them before claiming
  it.

## Gaps

"We don't know" tells the user the answer is not in the obvious places. They
then know to ask a person or to drop the question. A confident guess in its
place does harm, because they will act on it. Name each gap: the question, each
source searched, the queries, and what came back.
