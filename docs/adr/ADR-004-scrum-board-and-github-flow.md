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

## Consequences

**Good**
- The board shows at any moment what is done, what is in progress and what is left. At the end of Week 7: 33 issues closed, 0 open.
- Every line in `main` can be traced: commit → PR → issue → user story. That is the evidence trail I use in the defense.
- Small PRs are easy to review and easy to revert one by one (this paid off in the rollback drills, ADR-006 and ADR-009).

**Not so good**
- More steps for a small change: branch, PR, wait for CI, merge.
- Working alone, nobody reviews my PRs, so the PR is mostly a record and a CI checkpoint, not a code review.
- The rule only became enforced in Week 3, when branch protection was turned on (ADR-005). Before that it was just discipline.

## Key terms (my notes)

- **Scrum**: trabalho em sprints curtos com planejamento, entrega e retrospectiva no fim de cada ciclo.
- **User story**: o requisito escrito do ponto de vista do usuário: "Como X, quero Y, para Z".
- **Given-When-Then**: formato do critério de aceitação: *dado* um contexto, *quando* algo acontece, *então* o resultado esperado. Vira quase um teste.
- **Branch**: uma linha de trabalho separada do `main`, para mexer sem quebrar o que está no ar.
- **Pull request (PR)**: o pedido para juntar uma branch no `main`. É onde o CI roda e onde a mudança fica registrada.
- **GitHub Flow**: modelo simples: `main` sempre pronto para deploy, branches curtas, merge por PR.
- **Conventional Commits**: padrão de mensagem (`feat`, `fix`, `docs`...) que diz o tipo de mudança só pelo começo da linha.
