# ADR-001: Transition from Static Site to Containerized SSR Runtime

## Status

Accepted (Date: 2026-10-05)

## Context

The Farm Project website is currently built with Astro as a static site (SSG). The build output (`dist/`) is uploaded to Amazon S3 and served through CloudFront by the AWS CDK pipeline (`deploy-static.yml`).

This works well for public pages (home, modules, reports overview, updates), but the project is now moving from a showcase site to a working farm management system. It needs features that a static site cannot provide:

- **Operational health check** — a `/api/health` endpoint so the cloud platform can automatically verify that the application is alive and ready to receive traffic.
- **Receiving user data** — a `/api/feedback` endpoint, and later the animal registration form, which today is only a demo because there is no server to process it.
- **Live data** — future reports (active animals, weighing history, lot costs) must be generated from current data, not frozen at build time.

Amazon S3 only stores and serves files. It cannot execute server-side Node.js code, so none of these features can run on the current architecture.

## Options Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Keep SSG only (S3 + CloudFront)** | Cheapest, fastest, most secure; already working | No server code, no API endpoints, no health probes; every content change needs a rebuild | Rejected — cannot meet the new requirements |
| **Jamstack / hybrid** (static shell + external API) | Fast first load with dynamic widgets | Two separate systems to build, deploy and keep in sync | Rejected — too many moving parts for a single-developer project |
| **Serverless functions (AWS Lambda)** | Pay per request, automatic scaling | Cold-start latency, execution time limits, logic split into many small functions | Rejected — harder to run and test locally as one application |
| **SSR with `@astrojs/node` in a container** | One application for pages and APIs; runs the same way locally and in the cloud; supports health probes and structured logs | Needs a running server (compute cost) and container management | **Accepted** |

## Decision

We will configure Astro with `output: 'server'` and the `@astrojs/node` adapter in `standalone` mode. The application will expose:

- `GET /api/health` — returns HTTP 200 with `status`, `uptime` and `timestamp` in JSON.
- `POST /api/feedback` — validates and accepts feedback messages.
- Structured JSON logging for every request (`timestamp`, `level`, `route`, `method`, `statusCode`, `latencyMs`).

Public pages that do not need live data will keep `export const prerender = true`, so they are still generated as static HTML in `dist/client/` and the existing S3 + CloudFront deployment keeps working during the transition.

In the next iterations, the Node.js server (`dist/server/entry.mjs`) will be packaged as a Docker image (Week 6, Amazon ECR) and deployed to AWS App Runner (Week 7), which will use `/api/health` as its health check.

## Consequences

**Positive**

- Enables real API endpoints, so the animal registration form and live reports become possible.
- Health probes allow the platform to detect a crashed or unready application and restart it automatically.
- Structured JSON logs can be searched and filtered in Amazon CloudWatch (for example, all requests with `statusCode >= 500`).
- The same container runs identically on the developer laptop and in production, reducing "it works on my machine" problems.

**Negative**

- Higher operational complexity: a server must be running, monitored and patched, instead of only static files.
- Higher cost: compute time is paid even with low traffic, compared to S3 storage only.
- The build output changes (`dist/client` and `dist/server`), so the CDK `BucketDeployment` source must point to `dist/client`.
- Two deployment targets exist during the transition (S3 for static pages, container for the dynamic app) until the migration is complete.
