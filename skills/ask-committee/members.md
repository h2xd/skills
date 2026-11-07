# Committee members

Two chapters, each in three tiers. A lead merges its chapter's votes into a
position. In `full` mode, it first tests a hypothesis with calls. A member
judges in one lens. A worker builds or checks one thing. Each agent file
sets its own model, and the briefs `lead.md`, `member.md` and `worker.md`
give each tier its job.

An agent name reads `committee-<chapter>-<function>`. A call file names
agents by their short name, as the Words section of `calls.md` defines it.

## Design chapter

| Agent | Tier | Function | Lens | Can call | Can block |
|---|---|---|---|---|---|
| `h2xd:committee-design-director` | Lead | Design director | UX and UI craft, pixel by pixel | design-visual-designer, design-ux-designer, design-ui-prototyper, design-usability-tester | No |
| `h2xd:committee-design-visual-designer` | Member | Visual designer | Bold visual ideas. Does not bow to the existing design patterns | design-ui-prototyper | No |
| `h2xd:committee-design-ux-designer` | Member | UX designer | User paths, patterns, UX laws | design-usability-tester | Yes |
| `h2xd:committee-design-ui-prototyper` | Worker | UI prototyper | Builds one variant as a real page | Nobody | No |
| `h2xd:committee-design-usability-tester` | Worker | Usability tester | Walks a page as a user, writes feedback | Nobody | No |

## Engineering chapter

| Agent | Tier | Function | Lens | Can call | Can block |
|---|---|---|---|---|---|
| `h2xd:committee-engineering-director` | Lead | Engineering director | Systems design, patterns, performance | engineering-architect, engineering-software-engineer, engineering-spike-builder, engineering-performance-tester | No |
| `h2xd:committee-engineering-architect` | Member | Architect | Concepts and decision records | engineering-spike-builder | Yes |
| `h2xd:committee-engineering-software-engineer` | Member | Software engineer | Maintainability, complexity, duplication, dependencies | engineering-spike-builder, engineering-performance-tester | No |
| `h2xd:committee-engineering-spike-builder` | Worker | Spike builder | Builds a throwaway proof in a worktree | Nobody | No |
| `h2xd:committee-engineering-performance-tester` | Worker | Performance tester | Measures one number, the way `h2xd:prove-measure` says | Nobody | No |

## Why this shape

- Each lead pulls against a member. The design director polishes, and the
  visual designer proposes what the inventory lacks. The engineering
  director wants the best system, and the software engineer wants the
  simplest one to keep.
- The architect keeps the decisions honest. The UX designer keeps the user
  safe. A block passes through the lead unchanged.
- Workers give the leads and members evidence, a page or a number, in place
  of opinion.
- A new member or worker joins one chapter and one row. The chair's work does
  not grow, because the chair reads two chapter positions, not every vote.
