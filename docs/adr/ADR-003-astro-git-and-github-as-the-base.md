# ADR-003: Astro, Git and GitHub as the base of the project

## Status

Accepted (Date: 2026-09-09). Week 1, Milestone 0.

## Context

Week 1 was about the SDLC (the phases software goes through, from requirements to operations) and about how Git works inside. The lab asked for a personal repository with an Astro blog, so I had something real to put through the pipeline in the next weeks.

I had to choose three things at the start: the framework for the site, where the code would live, and how I would organise the work. I am working alone, so whatever I picked had to be simple to run on my laptop and easy to show in the defense.

## Options considered

| Option | Why I looked at it | Verdict |
|---|---|---|
| Plain HTML/CSS | I already had the Farm Project page in plain HTML | Rejected: no components, no build step, nothing for CI to check |
| Astro (static, SSG) | Course stack, builds to plain HTML, can move to a server later | **Accepted** |
| Next.js | Popular, very complete | Rejected: heavier than I need and not the course stack |
| GitHub | Course platform, Actions and Projects in the same place | **Accepted** |
| GitLab / Bitbucket | Good CI too | Rejected: one more tool to learn with no gain for this project |

## Decision

- I scaffolded the site with Astro's blog template and kept the default static output (`dist/` full of HTML files).
- The code lives in my own public GitHub repository, `cs4421-astro-blog`.
- I work with an Agile approach (Scrum on a GitHub board, details in ADR-004), because the course gives new tasks every week and the plan has to change with them. Waterfall would mean planning everything in week 1, which was not possible.

## Consequences

**Good**
- Astro gives me a static site now and a Node server later (ADR-001) with the same code. I did not have to change framework in Week 5.
- Git keeps every change as a commit, so I can always see what changed, when, and go back to it. That is what makes the rollback drills possible later.
- GitHub puts code, issues, board, pull requests and CI in one place.

**Not so good**
- My first commits were messages like `teste de envio` and `Test 16/09`. They work, but they tell nothing to someone reading the history. From Week 2 I moved to Conventional Commits (ADR-004).
- The template came with lorem ipsum and example posts. Some of it stayed on the live site until the Sprint 4 clean-up (PR #57).


