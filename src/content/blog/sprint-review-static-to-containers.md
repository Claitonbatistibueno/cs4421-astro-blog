---
title: 'Sprint review: from a static site to a container on ECS'
description: 'What changed between Week 3 and Week 7, and what the two rollback drills taught me.'
pubDate: '2026-10-21'
author: 'claiton'
---

This is a short review of the project from Week 3 to Week 7.

## What was delivered

| Week | Delivery |
|---|---|
| 3 | CI on every pull request: ESLint, `astro check`, Vitest and build. `main` only accepts green pull requests. |
| 4 | Static site on S3 and CloudFront, deployed with AWS CDK on every merge. |
| 5 | ADR-001: move to server rendering. Health endpoints and JSON logs. |
| 6 | Multi-stage Dockerfile. Release `v1.0.0` pushed to Amazon ECR. |
| 7 | Container on ECS Fargate behind a load balancer, deployed by `deploy-container.yml`, with CloudWatch logs and alarms. |

The project uses two long-lived branches. `main` builds the static site and `feat/server-side-rendering` builds the container. They produce different build outputs, so each one has its own pipeline.

## Rollback drill 1: static site

I merged a pull request with a red "BROKEN DEPLOY" banner on purpose. CI passed, because the code was valid. The banner went live. I used the Revert button on GitHub, merged the revert, and the pipeline put the old version back in about 3 minutes.

Lesson: tests check that the code works, not that the change is right. The revert keeps both commits in the history, so the mistake and the fix are visible.

## Rollback drill 2: container

This time `/api/health` returned 500. The load balancer marked the new tasks as unhealthy, the CloudWatch alarm for 5xx errors fired, and the ECS circuit breaker stopped the deployment. Users never saw the broken version, because the old task kept running until a new one was healthy.

I then redeployed the image `v1.0.0` from ECR. No build was needed, and it took 42 seconds.

Lesson: on a container platform the health check protects users before a person even looks at the problem. After the drill I added a test for the health routes, so the same bug now fails in CI instead of in production.

## Next

Clean up the content of the site, keep dependencies updated with Dependabot, and prepare for the Week 8 chaos drill.
