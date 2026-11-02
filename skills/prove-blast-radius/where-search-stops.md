# Where a search stops

A symbol search finds direct callers. Each row below is a way code depends on
the change without naming it. Check every row that can apply.

| Row | What breaks | How to check |
|---|---|---|
| Library source | The library behaves differently from its docs, or from the version you remember | Find the pinned version in the lockfile. Read the function's source in the installed package. Look for a local patch: a `patches/` directory, a vendored copy, a fork in the dependency list |
| Timing | Code runs in a different order: a microtask, a timer, an effect, teardown on unmount, a retry, a scheduled job | Trace when each side runs. Frameworks differ: an effect in one runs before paint, in another after. Check what happens when the component or process goes away mid-call |
| Data on the wire | A client parses the old shape of a response, event or message | Find every consumer of the payload, including other repos, mobile clients and other languages reading the same bytes. A renamed or removed field is a break. A new required field is a break for old senders |
| Stored data | Rows, cache entries, files or client state written by the old version are still there | Read the schema and the migration. Ask what happens when new code reads an old record, and when old code still running during a deploy reads a new one |
| Configuration | A feature flag, an env var or a config default changes the path taken | Search for the flag and the config key. Check every value it takes in each environment, including unset |
| Indirect references | A string-keyed lookup, a route, a dynamic import, reflection, a dependency container, a template or generated code names the symbol | Search for the name as a string, in every case style. Check generated files and their generator |
| Deleted code | Something removed is still called, imported, documented or tested elsewhere | Search for every deleted name, as code and as a string. Check docs, scripts, CI config and other packages |
| Three hops out | A caller of a caller depends on the old behavior: a return value, an error type, a side effect, an order | Follow the changed behavior up two more levels of callers. Note where a caller catches, retries or caches the result |
| Public contract | A published package, CLI flag, API endpoint or exit code changes for users outside the repo | Check the package's exports and the API spec. Any change there is a break for someone you cannot search |
| Concurrency | Two requests, tabs, workers or deploy versions run the changed code at once | Look for shared state: a module-level variable, a cache, a lock, a counter. Ask what two interleaved calls do |
