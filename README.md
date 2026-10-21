# Farm Project

Farm management for small and medium beef farms in Ireland: animals, lots, weighing,
feeding, health and finance, tracked per animal instead of by herd average.

This repository is also my CS4421 DevOps project at the University of Limerick. The farm
system is the product that goes through the full delivery pipeline.

| | URL |
|---|---|
| Static site (`main`) | https://d2j4j1lnep56cu.cloudfront.net |
| Container on ECS (`feat/server-side-rendering`) | http://farmec-servi-dgroigfr9odi-624728666.us-east-1.elb.amazonaws.com |
| Health check | `/api/health` on the container URL |

## Architecture

Two long-lived branches, because they build two different artifacts:

| Branch | Build output | Pipeline | Runs on |
|---|---|---|---|
| `main` | Static HTML (`dist/`) | `deploy-static.yml` | Amazon S3 + CloudFront |
| `feat/server-side-rendering` | Node.js server (`dist/server/entry.mjs`) in a Docker image | `deploy-container.yml` | Amazon ECR + ECS Fargate behind a load balancer |

Merging the server build into `main` would break the static deployment (there is no
`index.html` in a server build), so each branch keeps its own pipeline. The reasons are
recorded in [ADR-001](docs/adr/ADR-001-transition-to-ssr-and-containers.md) and
[ADR-002](https://github.com/Claitonbatistibueno/cs4421-astro-blog/blob/feat/server-side-rendering/docs/adr/ADR-002-run-ssr-container-on-ecs-fargate.md).

## Delivery pipeline

1. Every change starts as an issue on the Scrum board and goes through a pull request.
2. `ci.yml` runs on every pull request: ESLint, `astro check`, Vitest and the build.
   `main` is protected and only accepts green pull requests.
3. On merge:
   - `main` → the CDK `StaticSiteStack` uploads the site to S3 and invalidates CloudFront.
   - `feat/server-side-rendering` → the image is built, pushed to ECR (tag = commit SHA,
     or `vX.Y.Z` for a release) and rolled out on ECS with a health check on `/api/health`
     and an automatic rollback (deployment circuit breaker).
4. Dependabot opens weekly update pull requests, which go through the same checks.

Infrastructure is code in [`cdk/`](cdk). Logs are JSON lines in CloudWatch
(`/farm-project/ssr`), with alarms on unhealthy tasks and on HTTP 5xx responses.

## Rollback

| Where | How | Time |
|---|---|---|
| Static site | **Revert** the pull request on GitHub and merge the revert | ~3 min (rebuild) |
| Container | Run *Deploy Container to AWS* with an existing image tag, e.g. `v1.0.0` | ~1 min (no rebuild) |

The container workflow lives only on the server branch, so the *Run workflow* button
does not show on GitHub. Use the CLI instead:

```sh
gh workflow run deploy-container.yml --ref feat/server-side-rendering -f image_tag=v1.0.0
```

Both rollbacks were tested on 20/10/2026 (PRs #51/#53 and #52/#54).

## Run locally

Requirements: Node.js 22.

```sh
npm ci
npm run dev        # http://localhost:4321
npm run lint
npm run check
npm run test:unit
npm run build
```

The original PHP + MySQL system is in [`farm-app/`](farm-app). It runs with Docker:

```sh
cd farm-app
docker compose up --build   # http://localhost:8080
```

See [`farm-app/INTEGRATION.md`](farm-app/INTEGRATION.md) for details.

## Project structure

```
src/pages/          site pages, dashboard and reports
src/lib/            SQL dump reader and report calculations
src/content/blog/   Farm Updates posts
farm-app/           original PHP / MySQL / Python system
cdk/                AWS infrastructure (CDK)
docs/adr/           architecture decision records
.github/workflows/  CI and deployment pipelines
```
