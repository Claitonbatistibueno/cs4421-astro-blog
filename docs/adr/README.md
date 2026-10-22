# Architecture Decision Records

Each ADR records one decision: the context, the options I looked at, what I chose and what it costs. They follow the order of the course weeks.

| Week | Topic | ADR |
|---|---|---|
| W1 | SDLC, Git, Astro scaffold | [ADR-003: Astro, Git and GitHub as the base](ADR-003-astro-git-and-github-as-the-base.md) |
| W2 | Agile, user stories, collaborative Git | [ADR-004: Scrum board and GitHub Flow](ADR-004-scrum-board-and-github-flow.md) |
| W3 | Shift-left QA, CI, DevSecOps | [ADR-005: CI quality gate and branch protection](ADR-005-ci-quality-gate-and-branch-protection.md) |
| W4 | Cloud, IaC, Rollback Drill 1 | [ADR-006: S3 + CloudFront with CDK, rollback by revert](ADR-006-infrastructure-as-code-and-rollback-by-revert.md) |
| W5 | SSR, health probes, JSON logs | [ADR-001: Transition to SSR and containers](ADR-001-transition-to-ssr-and-containers.md) |
| W6 | Containers, 12-Factor, ECR | [ADR-007: Multi-stage image in ECR](ADR-007-multi-stage-container-image-in-ecr.md) |
| W5–W7 | Branch model | [ADR-008: Two long-lived branches](ADR-008-two-long-lived-branches.md) |
| W7 | Container hosting | ADR-002: Run the SSR container on ECS Fargate (on the [`feat/server-side-rendering`](https://github.com/Claitonbatistibueno/cs4421-astro-blog/blob/feat/server-side-rendering/docs/adr/ADR-002-run-ssr-container-on-ecs-fargate.md) branch) |
| W7 | CD, SRE, Rollback Drill 2 | [ADR-009: Safe releases and rollback by image tag](ADR-009-safe-container-releases-and-rollback-by-image-tag.md) |
| W8 prep | Deploy gate, smoke test | [ADR-010: Deploy gate and smoke test](ADR-010-deploy-gate-and-smoke-test.md) |

ADR-001 and ADR-002 were written during Weeks 5 and 7. ADR-003 to ADR-007 record decisions I took in Weeks 1 to 6 but only wrote down later, so their dates are the dates of the decision, not of the file.
