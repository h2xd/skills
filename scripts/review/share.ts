import { commentSeverity, ICON, isReviewBody, type Marker } from "./findings.ts"

export type { Marker }

export type Share = {
  green: number
  yellow: number
  red: number
  white: number
  counted: number
  percent: number
  reached: boolean
}

const ALL_GREEN_BELOW_THREADS = 10

type RatedThread = { isResolved: boolean; comments: { nodes: { body: string }[] } }

export function threadMarker(thread: RatedThread): Marker {
  if (thread.isResolved) return "🟢"
  const severity = commentSeverity(thread.comments.nodes[0]?.body ?? "")
  return severity === undefined ? "🟡" : ICON[severity]
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

export function reviewRounds(reviewBodies: string[]): number {
  return Math.max(0, reviewBodies.filter(isReviewBody).length - 1)
}

export type ShareReport = { goalShare: number; rounds: number; maxRounds: number }

export function formatShare(share: Share, report: ShareReport): string {
  return [
    `threads: ${share.counted + share.white}`,
    `🟢 ${share.green}`,
    `🟡 ${share.yellow}`,
    `🔴 ${share.red}`,
    `⚪ ${share.white}`,
    `share: ${share.percent}%`,
    `goal: ${Math.round(report.goalShare * 100)}%`,
    `rounds: ${report.rounds}`,
    `round limit: ${report.maxRounds}`,
    `reached: ${share.reached ? "yes" : "no"}`,
  ].join("\n")
}
