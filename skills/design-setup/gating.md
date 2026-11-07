# Keep design pages out of the production build

Every design page and every agent view route is dev-only. Pick one row for
the framework, and add the check that row names.

| Framework | Recipe | Check |
|---|---|---|
| Next.js, page extensions | Add `dev.tsx` and `dev.ts` to `pageExtensions` only when `NODE_ENV` is `development`. Name pages `page.dev.tsx` and route handlers `route.dev.ts` | Build check. Read `.next/app-path-routes-manifest.json` and fail on a design route |
| Next.js, route group | Put the pages in a `(design)` route group. Its layout calls `notFound()` in production | Runtime gate. The route answers 404 on the production server |
| Vite with a router | Register the design routes only inside `if (import.meta.env.DEV)` | Build check |
| SvelteKit | Put the routes under `src/routes/(design)/`. Return a 404 from `+layout.server.ts` when `dev` from `$app/environment` is false | Runtime gate. The route answers 404 on the production server |
| Astro, server route | Set `export const prerender = false`, which needs an SSR adapter. Return a 404 when `import.meta.env.PROD` is true | Runtime gate. The route answers 404 on the production server |
| Astro, dev integration | Add the pages with `injectRoute` from an integration that runs only in dev | Build check |
| Other | Serve the design pages from a separate dev-only entry point | Build check |

## Build check

After a production build, search the build output for a design route or a
design page title. Fail when one is found. Run the check in CI on every pull
request.

## Runtime gate check

Start the production server. Request one design route and one agent view
route. Fail when either answers anything but 404. Run the check in CI on
every pull request.
