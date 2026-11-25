export type Marker = "🟢" | "🟡" | "🔴" | "⚪"

export type Share = {
  green: number
  yellow: number
  red: number
  white: number
  counted: number
  percent: number
  reached: boolean
}

const MARKERS: Marker[] = ["🟢", "🟡", "🔴", "⚪"]

const UNRATED_THREAD: Marker = "🟡"

const ALL_GREEN_BELOW_THREADS = 10

export function commentMarker(body: string): Marker | null {
  const start = body.trimStart()
  return MARKERS.find((marker) => start.startsWith(marker)) ?? null
}

export function threadMarker(bodies: string[]): Marker {
  for (const body of bodies.toReversed()) {
    const marker = commentMarker(body)
    if (marker !== null) return marker
  }
  return UNRATED_THREAD
}

export function reviewShare(markers: Marker[], goalShare: number): Share {
  const count = (marker: Marker) => markers.filter((found) => found === marker).length
  const green = count("🟢")
  const yellow = count("🟡")
  const red = count("🔴")
  const counted = green + yellow + red
  const percent = counted === 0 ? 100 : Math.floor((green * 100) / counted)
  const goalPercent = Math.round(goalShare * 100)
  const enough =
    counted < ALL_GREEN_BELOW_THREADS ? green === counted : green * 100 >= goalPercent * counted
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
