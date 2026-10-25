# ADR-004: Scrum on a GitHub board, user stories and GitHub Flow

## Status

Accepted (Date: 2026-09-16). Week 2.

## Context

Week 2 covered Agile frameworks (Scrum, Kanban), user stories with Given-When-Then, and the ways teams share code with Git (trunk-based, GitFlow, GitHub Flow). The lab feature was the author schema: show the author's avatar, bio and links under each post (PR #4).

At this point I needed a way to plan the work week by week and a rule for how code gets into `main`. Without a rule, I was committing straight to `main`, and anything broken went straight to the live site.

## Options considered

**How to plan**

| Option | Verdict |
|---|---|
| A to-do list in my notes | Rejected: nobody else can see it and it is not linked to the code |
| Kanban only (continuous flow, no sprints) | Rejected: the course works in weekly cycles, so sprints fit better |
| **Scrum on GitHub Projects** | **Accepted**: sprints match the weeks, and each issue links to the PR that closes it |

**How code gets into `main`**

| Option | Verdict |
|---|---|
| Commit straight to `main` | Rejected: no review, no CI before the change is live |
| GitFlow (`develop`, `release`, `hotfix` branches) | Rejected: too many long-lived branches for one person and a weekly release |
| **GitHub Flow** (short branch per change, PR, merge) | **Accepted** |

## Decision

- The backlog is on a GitHub Project board. Each item is an issue (FARM-xx). The feature stories are written as user stories with acceptance criteria in Given-When-Then; smaller tasks (config, clean-up) are just a short description. I group the items in sprints on the board and close each sprint with the PRs that delivered it.
- Every change starts from `main` on its own branch, named by type: `feat/...`, `fix/...`, `docs/...`, `test/...`, `ci/...`.
- A change only reaches `main` through a pull request. The PR description has `Closes #N`, so GitHub closes the issue and links it when the PR is merged.
- Commit messages follow Conventional Commits: `type(scope): what changed`, for example `feat(reports): add farm dashboard`.
