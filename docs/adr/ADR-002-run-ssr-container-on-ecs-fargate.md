# ADR-002: Run the SSR container on Amazon ECS (Fargate) behind a load balancer

## Status

Accepted (Date: 2026-10-20). Refines the hosting choice in ADR-001.

## Context

ADR-001 moved the Farm Project to an Astro SSR server packaged as a container and expected
AWS App Runner as the host. The Week 7 deliverables require:

- a live containerised app reachable at an **AWS ECS** domain, with health check `/api/health`;
- a fully automated pipeline (`deploy-container.yml`) that tests, builds, pushes to **Amazon ECR** and rolls out with zero downtime;
- structured JSON logs in **Amazon CloudWatch**, an error alarm, and a cloud rollback to a previous image tag.

The static site (S3 + CloudFront) must stay live at the same time, from `main`.

## Options considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| AWS App Runner | Least configuration, HTTPS URL included | Not what the module assesses; less control over health checks, rollout and alarms | Rejected |
| ECS on EC2 instances | Cheapest compute at scale | Servers to patch and size — operational work with no benefit here | Rejected |
| **ECS on Fargate + Application Load Balancer** | Serverless containers; ALB health check on `/api/health`; rolling update and deployment circuit breaker; native CloudWatch logs | ALB has a fixed hourly cost; HTTP only until a domain/certificate is added | **Accepted** |

## Decision

Infrastructure as code in `cdk/lib/container-stacks.ts`:

- `FarmEcrStack` — ECR repository `farm-project` with scan-on-push and a 15-image lifecycle rule.
- `FarmEcsStack` — VPC with public subnets and **no NAT gateway**, ECS cluster, one Fargate task (0.25 vCPU / 512 MB) behind an ALB; health check `/api/health`; `minHealthy 100% / maxHealthy 200%` rolling updates; **circuit breaker with automatic rollback**; logs to `/farm-project/ssr`; alarms on unhealthy tasks and on `{ $.statusCode >= 500 }` from the JSON logs.

The same CDK app serves both targets via context: `-c target=static` (default, `main`) and
`-c target=container` (`feat/server-side-rendering`). Image tags are the git SHA for every
commit, or `vX.Y.Z` for releases, so any previous version can be redeployed.

## Consequences

- **Positive:** live dynamic pages and APIs with automated health checking, zero-downtime releases, self-healing rollbacks and searchable logs. Rollback is a redeploy of an existing image — no rebuild.
- **Negative:** the service costs money while it runs (the ALB is the largest fixed cost; Fargate for one small task is lower). It should be scaled down or destroyed after the assessment (`cdk destroy FarmEcsStack -c target=container`).
- **Follow-up:** HTTPS with a custom domain (ACM certificate) and moving the PHP system's database to Amazon RDS are out of scope for now.
