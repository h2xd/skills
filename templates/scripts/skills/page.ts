export type SkillRow = {
  skill: string
  technology: string
  updated: string
  due: string
}

const NO_TECHNOLOGY = "-"
const TABLE_HEADER = "| Skill | Technology | Updated | Review due |"
const TABLE_RULE = "|---|---|---|---|"
const HEADER_CELLS = /^\|\s*Skill\s*\|\s*Technology\s*\|\s*Updated\s*\|\s*Review due\s*\|\s*$/
const DATE_CELL = "(\\d{4}-\\d{2}-\\d{2})"
const ROW = new RegExp(
  `^\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|\\s*${DATE_CELL}\\s*\\|\\s*${DATE_CELL}\\s*\\|\\s*$`,
)

export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

export function parsePage(text: string): SkillRow[] {
  return text
    .split("\n")
    .map((line) => line.match(ROW))
    .filter((match) => match !== null)
    .map(([, skill, technology, updated, due]) => ({ skill, technology, updated, due }))
}

export function syncRows(
  rows: SkillRow[],
  skills: string[],
  today: string,
  intervalDays: number,
): SkillRow[] {
  return skills
    .toSorted()
    .map(
      (skill) =>
        rows.find((row) => row.skill === skill) ?? {
          skill,
          technology: NO_TECHNOLOGY,
          updated: today,
          due: addDays(today, intervalDays),
        },
    )
}

export function markReviewed(
  rows: SkillRow[],
  skill: string,
  today: string,
  intervalDays: number,
): SkillRow[] {
  if (!rows.some((row) => row.skill === skill)) throw new Error(`no row for ${skill}`)
  return rows.map((row) =>
    row.skill === skill
      ? {
          skill,
          technology: row.technology,
          updated: today,
          due: addDays(today, intervalDays),
        }
      : row,
  )
}

export function dueSkills(rows: SkillRow[], today: string): SkillRow[] {
  return rows
    .filter((row) => row.due <= today)
    .toSorted((a, b) => a.due.localeCompare(b.due) || a.skill.localeCompare(b.skill))
}

function defaultPage(today: string): string {
  return [
    "---",
    "type: Agent Config",
    "title: Skills",
    "description: The repo-local skills, the technology each one covers, and when its review is due.",
    "tags: [agents, skills]",
    `generated: { by: "scripts/skills.ts", at: "${today}" }`,
    "---",
    "",
    "# Skills",
    "",
    "One row per repo-local skill. `node scripts/skills.ts` keeps the table.",
  ].join("\n")
}

function tableLines(rows: SkillRow[]): string[] {
  return [
    TABLE_HEADER,
    TABLE_RULE,
    ...rows.map(
      (row) => `| ${row.skill} | ${row.technology} | ${row.updated} | ${row.due} |`,
    ),
  ]
}

export function formatPage(
  rows: SkillRow[],
  today: string,
  existing: string | null,
): string {
  const lines = (existing ?? "").split("\n")
  const start = lines.findIndex((line) => HEADER_CELLS.test(line))
  if (start === -1) {
    return `${[existing === null ? defaultPage(today).trimEnd() : existing.trimEnd(), "", ...tableLines(rows)].join("\n")}\n`
  }
  let end = start
  while (end < lines.length && lines[end].startsWith("|")) end++
  return [...lines.slice(0, start), ...tableLines(rows), ...lines.slice(end)].join("\n")
}
