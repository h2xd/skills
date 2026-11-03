/**
 * Serves the pages of one folder over HTTP and writes the answers a page
 * posts back. The page then works on another device in the same network,
 * and the answers land next to the form, with no save dialog.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { createServer, type Server } from "node:http"
import { networkInterfaces } from "node:os"
import { basename, join } from "node:path"
import { hashOf, parseAnswers } from "./build.ts"
import { parseJson } from "./check.ts"
import { CheckError } from "./shape.ts"

/** Large enough for hundreds of long notes, small enough to refuse a flood. */
const MAX_BODY = 256 * 1024
const NAME = /^\/([\w.-]+)\.(html|answers\.json)$/

/** Serves `<dir>/<name>.html` and accepts `POST <name>.answers.json`. `/` goes to `start`. */
export function pageServer(dir: string, start: string): Server {
  return createServer((request, response) => {
    const reply = (status: number, body: string, type = "text/plain; charset=utf-8") => {
      response.writeHead(status, { "content-type": type, "cache-control": "no-store" })
      response.end(body)
    }
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname)
    if (path === "/") {
      response.writeHead(302, { location: `/${encodeURIComponent(start)}` })
      return response.end()
    }
    const [, name, kind] = NAME.exec(path) ?? []
    if (request.method === "GET" && kind === "html" && existsSync(join(dir, `${name}.html`))) {
      return reply(200, readFileSync(join(dir, `${name}.html`), "utf8"), "text/html; charset=utf-8")
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
        writeFileSync(out, source)
        reply(200, JSON.stringify({ path: out }), "application/json")
      } catch (error) {
        if (!(error instanceof CheckError)) throw error
        reply(400, error.message)
      }
    })
  })
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
