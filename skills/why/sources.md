# Sources

Steps 2 and 3 of the skill cover decision records, wiki pages, the repo's own
tracker and git history. This page covers the other categories a session may
have connected. Map each connected tool to the one category that fits its main
evidence. When a tool fits two, pick one and say so under "Sources consulted".

| Category | Example tools | Best at |
|---|---|---|
| External tracker | Linear, Jira, Shortcut, a second GitHub repo | The product or business reason, when it came from outside engineering |
| Long-form docs | Notion, Confluence, Google Docs | Design reasoning written before the code |
| Chat | Slack, Discord, Microsoft Teams | Deliberation that never reached a doc or an issue |
| Observability | Datadog, Grafana, Honeycomb | The runtime signal behind a timeout, retry, rate limit or circuit breaker |
| Error tracking | Sentry, Rollbar, Bugsnag | The exceptions behind a catch block, null guard or retry |
| Product analytics | BigQuery, Snowflake, Databricks, dbt | The data behind a threshold, a flag or a migration |

Inspect each tool's schema before the first call. When a tool needs auth and
auth fails, stop and report the gap. Never report findings from a source you
could not open.

Bound every search in time. A window of about 30 days before and after the
merge of the anchor commit is the default. Widen it only with a reason.

## External tracker

- Fetch every ticket id from the code anchor first, with all comments.
- Search by feature name, symbol and business term, in several phrasings.
- Walk up from a sub-ticket to its parent. Parents carry the reason more often.
- Read attached specs and project pages. Note labels such as
  `customer-request`, `incident`, `compliance`, `perf`.
- Read the whole history. A ticket may have been reopened with a new scope.
  A boilerplate "why" section, such as "improve user experience", is not a
  reason.

## Long-form docs

- Search the feature name, symbols, author names, error strings and
  user-facing terms.
- Read whole pages. The reason often sits mid-document, under "Motivation" or
  "Alternatives considered".
- Follow child pages and backlinks. Check meeting notes from the same weeks.
- Specs often describe a plan that changed. Compare the doc with the merged
  PR and report any drift.
- Prefer the finalized or latest version when several drafts exist.

## Chat

- Search messages from the PR author around the merge date.
- Search the PR URL or `/pull/<n>`, and any error string the code handles.
- Always read the whole thread. One message reads differently without it.
- A joke or "just do the thing" is not a decision. Look for a considered
  exchange.
- Retention limits and private messages hide history. Name the cliff date as a
  gap.

## Observability

- Find the owning service, then its dashboards and monitors. A monitor
  threshold often answers "why is this clamped at N?".
- Pull the metric around the merge date. A spike before and calm after
  supports a cause. Check other changes in the same window.
- Search incidents in the window when the code looks defensive.
- Narrow logs by service, tag and time. Aggregate rather than dump.
- A metric shows that someone measured a thing, not that the code exists
  because of it.

## Error tracking

- Search by the exception classes, error strings, function names and file
  path the target handles.
- For each issue, note first seen, last seen, affected releases and the event
  trend. Does it stop at the release that shipped the target?
- Quote a stack trace excerpt that passes through the target.
- AI root-cause summaries from the tool are hypotheses, not evidence.

## Product analytics

- Confirm every table and column exists before you query it. Schemas differ
  per company.
- Event volume by day around the merge: a jump from zero suggests a launch, a
  drop to zero suggests a removal. Check for an instrumentation change first.
- For a threshold, take the median, p99 and max of the measured value in the
  two weeks before the merge. A p99 that matches the constant suggests the
  number came from data.
- Return counts and percentiles with the exact query and window, never raw
  rows.

## Incidents

Add these when the target looks defensive. Defensive code includes null
checks, retries, timeouts, rate limits, feature flags and out-of-memory
handlers.

- **Tracker:** labels such as `incident`, `sev-*`, `postmortem`,
  `reliability`.
- **Chat:** incident channels around the date the code was added.
- **Git:** "fix for incident", "add defensive check", and a revert followed by
  a re-apply.
- **Docs:** postmortems that name the target, its symbols or its error strings.
