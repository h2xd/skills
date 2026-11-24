/** The share of review threads that are 🟢, behind `node scripts/review.ts share`. */

export type Marker = "🟢" | "🟡" | "🔴" | "⚪"

export type Share = {
  green: number
  yellow: number
  red: number
  white: number
  /** The threads that count: every thread but the ⚪ ones. */
  counted: number
  /** The share of counted threads that are 🟢, rounded down. 100 when none count. */
  percent: number
  reached: boolean
}

const MARKERS: Marker[] = ["🟢", "🟡", "🔴", "⚪"]

/** With fewer counted threads than this, every one must be 🟢. */
const SHARE_FROM_THREADS = 10

export function commentMarker(body: string): Marker | null {
  const start = body.trimStart()
  return MARKERS.find((marker) => start.startsWith(marker)) ?? null
}

/** The marker of the last comment that has one. A thread with no marker needs attention: 🟡. */
export function threadMarker(bodies: string[]): Marker {
  for (const body of bodies.toReversed()) {
    const marker = commentMarker(body)
    if (marker !== null) return marker
  }
  return "🟡"
}

/** `goalShare` is a fraction, such as 0.9 for 90%. */
export function reviewShare(markers: Marker[], goalShare: number): Share {
  const count = (marker: Marker) => markers.filter((found) => found === marker).length
  const green = count("🟢")
  const yellow = count("🟡")
  const red = count("🔴")
  const counted = green + yellow + red
  const percent = counted === 0 ? 100 : Math.floor((green * 100) / counted)
  const goalPercent = Math.round(goalShare * 100)
  const enough =
    counted < SHARE_FROM_THREADS ? green === counted : green * 100 >= goalPercent * counted
  return { green, yellow, red, white: count("⚪"), counted, percent, reached: red === 0 && enough }
}

export function formatShare(share: Share, goalShare: number): string {
  return [
    `threads: ${share.counted + share.white}`,
    `🟢 ${share.green}`,
    `🟡 ${share.yellow}`,
    `🔴 ${share.red}`,
    `⚪ ${share.white}`,
    `share: ${share.percent}%`,
    `goal: ${Math.round(goalShare * 100)}%`,
    `reached: ${share.reached ? "yes" : "no"}`,
  ].join("\n")
}
