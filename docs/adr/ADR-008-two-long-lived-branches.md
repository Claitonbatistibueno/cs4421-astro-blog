# ADR-008: Two long-lived branches, one for the static site and one for the SSR container

## Status

Accepted (Date: 2026-10-20). Weeks 5 to 7. Same model as the instructor's reference repository (`main` + `22-add-server-side-rendering`).

## Context

From Week 5 (ADR-001) the project needs two things live at the same time:

- the **static site** on S3 + CloudFront (Milestone 1), and
- the **containerised SSR app** on Amazon ECS (Milestones 3 and 4, ADR-002).

The problem is the build output. With Astro's static mode, `npm run build` gives me `dist/` with an `index.html` for every page, ready to upload to S3. When I switch to `output: 'server'`, the same command gives me `dist/server/entry.mjs` and `dist/client/`. That is a program to run, not a folder of pages. If I put the server mode on `main`, the S3 pipeline would upload something that is not a website, and the static site would break.

## Options considered

| Option | Verdict |
|---|---|
| Move everything to SSR on `main` and stop the static site | Rejected: Milestone 1 must stay live |
| One branch, two builds controlled by a flag in the pipeline | Rejected: more complex config, and a mistake in the flag breaks both sites at once |
| Two repositories | Rejected: the content and the farm data would be duplicated in two places |
| **Two long-lived branches, each with its own pipeline** | **Accepted** |

## Decision

| Branch | Build | Pipeline | Where it runs |
|---|---|---|---|
| `main` | Static (SSG) → `dist/` | `ci.yml` + `deploy-static.yml` | S3 + CloudFront |
| `feat/server-side-rendering` | Server (SSR) → `dist/server` + `dist/client` | `deploy-container.yml` | Docker image → ECR → ECS Fargate |

- New content, fixes and tests go to `main` first, through a normal PR.
- After that, a **sync PR** `main → feat/server-side-rendering` brings the same changes to the container (example: PR #60).
- The sync PR is merged with **Create a merge commit**, not squash or rebase. The merge commit has two parents, so Git remembers which `main` commits are already in the SSR branch, and the next sync only brings the new ones.

## Consequences

**Good**
- Each system can be deployed and rolled back on its own. A problem in the container never takes the static site down, and the other way round.
- Both deliverables are live at the same time, which is what the assessment checks.

**Not so good**
- The two branches drift. Anything changed on `main` has to be synced by hand, and if I forget, the two sites show different content.
- The `main-protection` ruleset only covers `main`. The SSR branch still accepts direct pushes. It should be added to the ruleset.
- GitHub only shows the **Run workflow** button for workflows that exist on the default branch. `deploy-container.yml` is only on the SSR branch, so in Rollback Drill 2 I had to start the rollback through the API (`gh workflow run ... --ref feat/server-side-rendering`).

## Key terms (my notes)

- **Long-lived branch**: branch que não é apagada depois do merge; vive o projeto inteiro em paralelo ao `main`.
- **SSR (Server-Side Rendering)**: a página é montada no servidor a cada pedido, então pode mostrar dados atuais e ter APIs.
- **Build artifact**: o resultado do build que vai para produção (aqui, a pasta `dist/` ou a imagem Docker).
- **Merge commit**: commit com dois "pais" que junta duas branches e guarda no histórico que elas foram unidas.
- **Squash / rebase**: outras formas de merge que reescrevem os commits; o Git perde o registro do que já foi juntado.
- **Drift**: quando duas branches ou dois ambientes vão ficando diferentes sem ninguém perceber.
