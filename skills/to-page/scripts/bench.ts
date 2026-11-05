#!/usr/bin/env node
/**
 * Opens a built page in headless Chrome over the DevTools protocol and checks
 * what a unit test cannot: network requests, load time, the draft after a
 * reload, and the save fallback. Needs Chrome, so it is not part of npm test.
 *
 *   node bench.ts <page.html> [--chrome <path>]
 *
 * Exits 1 when a check fails.
 */

import { spawn } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { chrome: { type: "string", default: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" } },
})
if (positionals.length !== 1) {
  console.error("usage: node bench.ts <page.html> [--chrome <path>]")
  process.exit(1)
}
const url = pathToFileURL(resolve(positionals[0])).href
const profile = mkdtempSync(join(tmpdir(), "to-page-bench-"))
const chrome = spawn(values.chrome, ["--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"])

type Message = { id?: number; method?: string; params?: Record<string, unknown>; result?: Record<string, unknown> }
const isMessage = (value: unknown): value is Message => typeof value === "object" && value !== null

const endpoint = await new Promise<string>((done) =>
  chrome.stderr.on("data", (data) => {
    const match = /DevTools listening on (ws:\S+)/.exec(String(data))
    if (match) done(match[1])
  }),
)
const socket = new WebSocket(endpoint)
await new Promise((done) => (socket.onopen = done))
const pending = new Map<number, (message: Message) => void>()
const events: Message[] = []
socket.onmessage = (event) => {
  const message: unknown = JSON.parse(String(event.data))
  if (!isMessage(message)) return
  if (message.id !== undefined) pending.get(message.id)?.(message)
  else events.push(message)
}
let nextId = 0
let session: string | undefined
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<Message>((done) => {
    nextId++
    pending.set(nextId, done)
    socket.send(JSON.stringify({ id: nextId, method, params, sessionId: session }))
  })
const evaluate = async (expression: string, userGesture = false): Promise<unknown> => {
  const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture })
  const result = reply.result?.result
  return typeof result === "object" && result !== null && "value" in result ? result.value : undefined
}
const load = async () => {
  events.length = 0
  await send("Page.navigate", { url })
  while (!events.some((event) => event.method === "Page.loadEventFired")) await new Promise((done) => setTimeout(done, 5))
}

const target = await send("Target.createTarget", { url: "about:blank" })
const attached = await send("Target.attachToTarget", { targetId: target.result?.targetId, flatten: true })
session = String(attached.result?.sessionId)
await send("Network.enable")
await send("Page.enable")

const checks: { name: string; pass: boolean; detail: string }[] = []

await load()
const requests = events.filter((event) => event.method === "Network.requestWillBeSent").length
checks.push({ name: "requests", pass: requests === 1, detail: `${requests}, want 1: the page itself` })

const times: number[] = []
for (let run = 0; run < 5; run++) {
  await load()
  times.push(Number(await evaluate('performance.getEntriesByType("navigation")[0].loadEventEnd')))
}
const median = times.sort((a, b) => a - b)[2]
checks.push({ name: "load", pass: median <= 50, detail: `median ${median.toFixed(1)} ms of 5 after a warm-up, want ≤ 50 ms` })

await evaluate(`(() => {
  const form = document.getElementById("page")
  form.querySelector("input[type=radio]").checked = true
  const done = form.querySelector("input[data-done][type=checkbox]")
  if (done) done.checked = true
  form.querySelector("textarea[name]").value = "bench note"
  form.dispatchEvent(new Event("input"))
})()`)
await load()
const restored = await evaluate(`document.querySelector("textarea[name]").value === "bench note" && document.querySelector("input[type=radio]").checked`)
checks.push({ name: "draft", pass: restored === true, detail: "a note and a pick survive a reload" })

await evaluate(`document.getElementById("save").click()`, true)
const reviewed = await evaluate(`document.getElementById("confirm").open && document.querySelectorAll("#review li").length`)
checks.push({ name: "review", pass: Number(reviewed) > 0, detail: `Submit opens the review with every item: ${reviewed}` })
await evaluate(`document.getElementById("send").click()`, true)
await new Promise((done) => setTimeout(done, 500))
const saved = await evaluate(`(() => {
  if (document.getElementById("result").hidden) return "no result shown"
  const text = document.getElementById("out").value
  try {
    const answers = JSON.parse(text).answers
    return Object.values(answers).some((answer) => answer.note === "bench note") ? "ok" : "note missing: " + text
  } catch { return "the result is not the answers JSON: " + text }
})()`)
checks.push({ name: "save fallback", pass: saved === "ok", detail: `headless Chrome cancels the picker, so the page shows the JSON: ${saved}` })

for (const check of checks) console.log(`${check.pass ? "🟢" : "🔴"} ${check.name}: ${check.detail}`)
socket.close()
const exited = new Promise((done) => chrome.once("exit", done))
chrome.kill()
await exited
rmSync(profile, { recursive: true, force: true, maxRetries: 5 })
process.exit(checks.every((check) => check.pass) ? 0 : 1)
