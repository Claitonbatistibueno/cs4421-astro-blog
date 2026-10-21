# ADR-009: Safe container releases, monitoring, and rollback by image tag

## Status

Accepted (Date: 2026-10-20). Week 7, Milestone 4 and Rollback Drill 2 (PRs #52, #54, #55). Builds on ADR-002 (ECS Fargate) and ADR-007 (images in ECR).

## Context

Week 7 was about Continuous Delivery and SRE: how to release often without breaking things for users, how to notice when something does break, and how to get back to a working version fast. The slides follow an incident in four steps: Detection → Triage → Mitigation → Post-mortem. The golden rule is: mitigate first, debug later.

In Week 4 my rollback was `git revert` (ADR-006). It works, but it rebuilds everything and users see the bug for about 3 minutes. For the container I wanted something faster, and if possible, something users would not even notice.

## Decision

**1. Every push to the SSR branch is deployed automatically** (`deploy-container.yml`): quality gate (lint, check, tests, CDK tests) → build the image → push to ECR (tag = commit SHA) → `cdk deploy` → smoke test on `/api/health`. This is Continuous Deployment: no manual approval in the normal path.

**2. The ECS service protects users during a release** (`cdk/lib/container-stacks.ts`):
- rolling update with `minHealthyPercent: 100` and `maxHealthyPercent: 200`: the new task starts next to the old one, and the old one only stops when the new one is healthy;
- the load balancer checks `/api/health` every 15 s, and 2 failures in a row mark a task unhealthy;
- `healthCheckGracePeriod: 30 s` gives Node time to start before failures count;
- **circuit breaker** with rollback: if the new tasks never become healthy, ECS cancels the release and keeps the previous version.

**3. Problems are visible** in CloudWatch:
- every request is one JSON log line in `/farm-project/ssr`;
- a metric filter `{ $.statusCode >= 500 }` turns 5xx lines into a metric;
- two alarms: `farm-project-http-5xx` and `farm-project-unhealthy-tasks`.

**4. Rollback = redeploy an old image.** The workflow has a `workflow_dispatch` input `image_tag`. If I give it an existing tag (for example `v1.0.0`), it skips the tests and the build and only rolls that image out.

## Rollback Drill 2 (what happened)

| Step | What I saw / did |
|---|---|
| Bad deploy | PR #52 made `/api/health` return 500. CI passed, the code was valid. The image was built and pushed. |
| Detection | The `farm-project-http-5xx` alarm went **In alarm**. |
| Triage | New tasks failed the load balancer health check and were stopped. Logs showed `"statusCode":500`. |
| Automatic protection | The `v1.0.0` task was never stopped, so **users had no outage**. The circuit breaker cancelled the release. |
| Mitigation | Ran the workflow with `image_tag=v1.0.0`: back to the good version in **42 seconds**, no rebuild. |
| Fix in code | Revert PR #54, so the code and the running image match again. |
| Post-mortem | Root cause: no test checked the status code of `/api/health`. Action: PR #55 added that test. Against the broken code it fails with `expected 500 to be 200`. |

## Consequences

**Good**
- A bad release is stopped by the health check before users see it.
- Rollback is 42 seconds instead of about 3 minutes, because the image already exists in ECR.
- The post-mortem turned a production incident into a CI test, so the same bug is now caught in seconds, before the merge.

**Not so good**
- Only one task (`desiredCount: 1`) to keep the cost low. If that task is killed, the app is down for 1 to 2 minutes until ECS starts a new one. Two tasks in two Availability Zones would fix it but double the Fargate cost.
- The load balancer costs money every hour it exists, so the stacks should be destroyed after the assessment.
- The ECS URL is HTTP only. HTTPS needs a domain and a certificate.
- The health check logs a line every 15 s. It is noise, but the 5xx alarm depends on those lines, so I kept them.

## Key terms (my notes)

- **Continuous Delivery vs Continuous Deployment**: na Delivery, o deploy em produção espera uma aprovação manual; na Deployment, todo merge que passa nos testes vai direto para produção.
- **SRE (Site Reliability Engineering)**: tratar a confiabilidade como engenharia, com metas (SLO), alarmes e processos para incidentes.
- **SLO**: a meta de confiabilidade combinada, por exemplo "99,9% dos pedidos com sucesso".
- **Rolling update**: troca as versões aos poucos, sobe a nova antes de derrubar a antiga, sem tirar o site do ar.
- **Health check**: o load balancer chama `/api/health`; se não recebe 200, para de mandar usuários para aquela tarefa.
- **Circuit breaker**: se a versão nova continua falhando, o ECS desiste do deploy e volta para a versão anterior sozinho.
- **Metric filter / alarm**: o CloudWatch conta as linhas de log que batem com um padrão (aqui, erro 500) e dispara um alarme quando passa do limite.
- **Immutable image tag**: cada imagem tem uma tag que nunca muda de conteúdo, então voltar para `v1.0.0` é voltar exatamente para aquilo.
- **Post-mortem (blameless)**: análise depois do incidente focada no processo, não em culpados, que termina com uma ação para não repetir.
