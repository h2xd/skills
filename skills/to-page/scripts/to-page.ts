#!/usr/bin/env node
/**
 * Turns a small JSON form file into a self-contained HTML page.
 *
 *   node to-page.ts types               list the page types
 *   node to-page.ts spec <type>         fields, rules and an example for one type
 *   node to-page.ts spec --md           write spec.md for the skill
 *   node to-page.ts check <file>        check a form file, write nothing
 *   node to-page.ts render <file>       check it and write the page next to it
 *   node to-page.ts serve <file>        render it, then serve its folder over HTTP
 *     [--host 127.0.0.1] [--port 0]     --host 0.0.0.0 opens it to the network
 */

import { writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import { build, loadChain } from "./build.ts"
import { formatIssues } from "./check.ts"
import { isPageType, PAGES } from "./schema.ts"
import { pageServer, urlsOf } from "./serve.ts"
import { CheckError } from "./shape.ts"
import { spec, specMarkdown } from "./spec.ts"

const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`to-page needs Node 22.18 or later, this is ${process.versions.node}.`)
  process.exit(1)
}

const TYPES: Record<keyof typeof PAGES, string> = {
  checklist: "Items to work through and tick off, each with an optional question and a note.",
  grilling: "Questions with options and a recommendation, in rounds that build on the answers before.",
  questionnaire: "Broad questions for a customer or a person outside the team, grouped by theme, with open answers where options do not fit.",
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { md: { type: "boolean" }, host: { type: "string", default: "127.0.0.1" }, port: { type: "string", default: "0" } },
})
const [command, argument] = positionals

/** Runs until the process is stopped. Prints one URL per line. */
function serve(file: string): void {
  const page = build(file)
  const port = Number(values.port)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`--port must be a number from 0 to 65535, got "${values.port}"`)
    process.exit(1)
  }
  const server = pageServer(dirname(page), basename(page))
  server.on("error", (error) => {
    console.error(`to-page serve: ${error.message}`)
    process.exit(1)
  })
  server.listen(port, values.host, () => {
    const address = server.address()
    if (address === null || typeof address === "string") return
    for (const url of urlsOf(values.host, address.port, page)) console.log(url)
  })
}

function run(): number | "serving" {
  switch (command) {
    case "types":
      for (const [type, summary] of Object.entries(TYPES)) console.log(`${type}: ${summary}`)
      return 0
    case "spec":
      if (values.md) {
        writeFileSync(join(import.meta.dirname, "..", "spec.md"), specMarkdown())
        console.log("wrote spec.md")
        return 0
      }
      if (!isPageType(argument)) {
        console.error(`usage: to-page spec <type>. Types: ${Object.keys(PAGES).join(", ")}`)
        return 1
      }
      console.log(spec(argument))
      return 0
    case "check":
    case "render": {
      if (argument === undefined) {
        console.error(`usage: to-page ${command} <dir>/round-1.form.json`)
        return 1
      }
      const file = resolve(argument)
      if (command === "check") {
        loadChain(file)
        console.log("ok")
      } else {
        console.log(pathToFileURL(build(file)).href)
      }
      return 0
    }
    case "serve":
      if (argument === undefined) {
        console.error("usage: to-page serve <dir>/round-1.form.json [--host 0.0.0.0] [--port 8080]")
        return 1
      }
      serve(resolve(argument))
      return "serving"
    default:
      console.error("usage: to-page types | spec <type> | check <file> | render <file> | serve <file>")
      return 1
  }
}

try {
  const code = run()
  if (code !== "serving") process.exit(code)
} catch (error) {
  if (!(error instanceof CheckError)) throw error
  console.error(formatIssues(error))
  process.exit(1)
}
