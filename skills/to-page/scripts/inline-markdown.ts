/**
 * The inline Markdown subset a form text may use: `code`, **bold**,
 * [link](url) and line breaks. Everything else is escaped, so a form file
 * can never put HTML on the page.
 */

import { escapeHtml } from "./template.ts"

const SAFE_URL = /^(https?:\/\/|\/|\.{0,2}\/|#|[\w.-]+(\/|$))/i

export function inlineMarkdown(source: string): string {
  const parts = source.split(/(`[^`\n]+`)/)
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return `<code>${escapeHtml(part.slice(1, -1))}</code>`
      return escapeHtml(part)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) =>
          SAFE_URL.test(url) && !/^\s*javascript:/i.test(url) ? `<a href="${url}">${label}</a>` : whole,
        )
        .replace(/\n/g, "<br>")
    })
    .join("")
}
