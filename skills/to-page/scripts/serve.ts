/**
 * Serves the pages of one folder over HTTP and writes the answers a page
 * posts back. The page then works on another device in the same network,
 * and the answers land next to the form, with no save dialog.
 *
 * A POST never overwrites saved answers by accident: it needs `?replace=1`,
 * which the page sends only after it showed the saved answers.
 *
 * Open pages listen on `/events`. When a newer page appears in the folder,
 * such as the next round, the server sends its path and the page loads it.
 */

import { existsSync, readdirSync, readFileSync, statSync, watch, writeFileSync } from "node:fs"
import { createServer, type Server, type ServerResponse } from "node:http"
import { networkInterfaces } from "node:os"
import { basename, join } from "node:path"
import { hashOf, parseAnswers } from "./build.ts"
import { parseJson } from "./check.ts"
import { CheckError } from "./shape.ts"

/** Large enough for hundreds of long notes, small enough to refuse a flood. */
const MAX_BODY = 256 * 1024
const NAME = /^\/([\w.-]+)\.(html|answers\.json)$/
/** A render writes the page in more than one event. Wait for the last one. */
const SETTLE_MS = 100
/** Proxies close a stream that sends nothing. A comment line keeps it open. */
const KEEP_ALIVE_MS = 25_000

/** The page in `dir` written last, or undefined when there is none. */
export function newestPage(dir: string): string | undefined {
  let newest: { name: string; time: number } | undefined
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".html")) continue
    const time = statSync(join(dir, name)).mtimeMs
    if (newest === undefined || time > newest.time) newest = { name, time }
  }
  return newest?.name
}

/**
 * Serves `<dir>/<name>.html`, accepts `POST <name>.answers.json` and streams
 * the newest page on `/events`. `/` goes to the newest page. `onSave` gets
 * the path of each answers file the server writes.
 */
export function pageServer(dir: string, onSave: (path: string) => void = () => {}): Server {
  const listeners = new Set<ServerResponse>()
  let announced = newestPage(dir)
  let settle: NodeJS.Timeout | undefined
  const watcher = watch(dir, (_event, name) => {
    if (!name?.endsWith(".html")) return
    clearTimeout(settle)
    settle = setTimeout(() => {
      const newest = newestPage(dir)
      if (newest === undefined || newest === announced) return
      announced = newest
      for (const listener of listeners) listener.write(`data: /${encodeURIComponent(newest)}\n\n`)
    }, SETTLE_MS)
  })
  const keepAlive = setInterval(() => {
    for (const listener of listeners) listener.write(":\n\n")
  }, KEEP_ALIVE_MS)

  const server = createServer((request, response) => {
    const reply = (status: number, body: string, type = "text/plain; charset=utf-8") => {
      response.writeHead(status, { "content-type": type, "cache-control": "no-store" })
      response.end(body)
    }
    const url = new URL(request.url ?? "/", "http://x")
    const path = decodeURIComponent(url.pathname)
    if (path === "/") {
      const newest = newestPage(dir)
      if (newest === undefined) return reply(404, "no page in this folder yet")
      response.writeHead(302, { location: `/${encodeURIComponent(newest)}` })
      return response.end()
    }
    if (path === "/events") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" })
      response.write(":\n\n")
      listeners.add(response)
      request.on("close", () => listeners.delete(response))
      return
    }
    const [, name, kind] = NAME.exec(path) ?? []
    if (request.method === "GET" && kind === "html" && existsSync(join(dir, `${name}.html`))) {
      return reply(200, readFileSync(join(dir, `${name}.html`), "utf8"), "text/html; charset=utf-8")
    }
    if (request.method === "GET" && kind === "answers.json" && existsSync(join(dir, `${name}.answers.json`))) {
      return reply(200, readFileSync(join(dir, `${name}.answers.json`), "utf8"), "application/json")
    }
    if (request.method !== "POST" || kind !== "answers.json") return reply(404, "not found")

    const form = join(dir, `${name}.form.json`)
    if (!existsSync(form)) return reply(404, `no form ${name}.form.json`)
    const chunks: Buffer[] = []
    let size = 0
    request.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) request.destroy()
      else chunks.push(chunk)
    })
    request.on("end", () => {
      const file = `${name}.answers.json`
      try {
        const source = Buffer.concat(chunks).toString("utf8")
        const answers = parseAnswers(parseJson(source), file)
        if (answers.form !== hashOf(readFileSync(form, "utf8"))) {
          return reply(409, `${name}.form.json changed after this page was rendered. Reload the page.`)
        }
        const out = join(dir, file)
        if (existsSync(out) && url.searchParams.get("replace") !== "1") {
          return reply(409, `${file} was already submitted, maybe from another device. Reload the page to see those answers.`)
        }
        writeFileSync(out, source)
        reply(200, JSON.stringify({ path: out }), "application/json")
        onSave(out)
      } catch (error) {
        if (!(error instanceof CheckError)) throw error
        reply(400, error.message)
      }
    })
  })
  server.on("close", () => {
    watcher.close()
    clearInterval(keepAlive)
    clearTimeout(settle)
  })
  return server
}

/** The URLs a person can open: the host itself, or every IPv4 address when it listens on all of them. */
export function urlsOf(host: string, port: number, page: string): string[] {
  const all = host === "0.0.0.0" || host === "::"
  const hosts = all
    ? Object.values(networkInterfaces())
        .flatMap((nets) => nets ?? [])
        .filter((net) => net.family === "IPv4")
        .map((net) => net.address)
    : [host.includes(":") ? `[${host}]` : host]
  return hosts.map((name) => `http://${name}:${port}/${encodeURIComponent(basename(page))}`)
}

/**
 * Resolves with the answers file of `form` once it exists and matches the
 * form's hash. A stale answers file from an earlier version of the form does
 * not count. With `after`, an ISO time, only answers saved later count, so a
 * replace of answers the agent already read wakes it again.
 */
export function waitForAnswers(form: string, answers: string, after?: string, pollMs = 500): Promise<string> {
  const since = after === undefined ? -Infinity : Date.parse(after)
  return new Promise((resolve) => {
    const poll = () => {
      try {
        const source = readFileSync(answers, "utf8")
        const parsed = parseAnswers(parseJson(source), basename(answers))
        if (parsed.form === hashOf(readFileSync(form, "utf8")) && Date.parse(parsed.saved) > since) {
          return resolve(source)
        }
      } catch {
        // Missing, or written only in part. Try again.
      }
      setTimeout(poll, pollMs)
    }
    poll()
  })
}
