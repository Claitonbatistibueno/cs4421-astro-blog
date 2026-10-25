# ADR-007: Multi-stage Docker image stored in Amazon ECR



## Context

After ADR-001 the site became a Node.js server (`dist/server/entry.mjs`). A server has to run somewhere, and Week 6 was about packaging it as a container so it runs the same way on my laptop, in CI and in AWS.

The slides also covered the 12-Factor App. The four points that matter most here are: config in the environment, stateless processes, port binding and disposability (the container can be stopped and replaced at any time).

One honest note: I wrote the first version of this work on 07/10 but never pushed it to GitHub, and I lost it. I rebuilt it on 20/10 (PR #50). Since then I push every branch as soon as it has a commit, even before the PR.

## Options considered

| Option | Verdict |
|---|---|
| Single-stage image (build and run in the same image) | Rejected: ships the source code, dev tools and build cache to production; bigger and with more packages that can have vulnerabilities |
| **Multi-stage image on `node:22-alpine`** | **Accepted** |
| Docker Hub as the registry | Rejected: separate account and permissions, and it was blocked in my build environment |
| **Amazon ECR** | **Accepted**: same AWS account as the service, scans images on push |

## Decision

The `Dockerfile` has two stages:

1. **builder**: copies `package*.json` first and runs `npm ci`, then copies the code and runs `npm run build`, then `npm prune --omit=dev` removes ESLint, Vitest and the rest of the dev tools.
2. **runner**: a clean `node:22-alpine` that only receives `package*.json`, the production `node_modules`, `dist/` and the farm data file.

Other choices in the image:
- `ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321`: config comes from the environment (12-Factor), and `0.0.0.0` lets traffic from outside the container reach the server.
- `USER node`: the server does not run as root.
- `HEALTHCHECK` calls `/api/health/ready` every 30 s. After 3 failures Docker marks the container as `unhealthy`.
- `.dockerignore` keeps `node_modules`, `.git`, `cdk/`, docs and any `.env` file out of the build.

In ECR (`FarmEcrStack`):
- every image is tagged with the commit SHA, and releases with a version (`v1.0.0`);
- images are scanned for known vulnerabilities on push;
- only the last 15 images are kept.

## Consequences

**Good**
- Same image everywhere, so no more "it works on my machine".
- Copying `package*.json` before the code means Docker reuses the dependency layer when only code changes. The rebuild takes seconds instead of reinstalling about 400 packages.
- Smaller image with fewer packages: faster to push and pull, smaller attack surface.
- Every image in ECR is a version I can go back to without rebuilding. This is what makes the 42-second rollback in Week 7 possible (ADR-009).

**Not so good**
- A broken Dockerfile is only found when the deploy pipeline builds it, after the merge. A `docker build` job in the PR CI would catch it earlier.
- Keeping 15 images costs a little storage. I accepted it in exchange for rollback history.

## Key terms (my notes)

- **Container**: o app empacotado com tudo que precisa para rodar (Node, dependências, código). Roda igual em qualquer máquina.
- **Image**: o "molde" do container, gerado pelo `docker build`. O container é a imagem rodando.
- **Multi-stage build**: um estágio para compilar e outro, limpo, só para rodar. O que é de build não vai para produção.
- **Layer cache**: o Docker guarda cada passo; se nada mudou naquele passo, ele reaproveita e não refaz.
- **Registry (ECR)**: o "repositório" de imagens, como o GitHub é para código.
- **Tag**: o nome da versão da imagem (aqui, o SHA do commit ou `v1.0.0`).
- **HEALTHCHECK**: comando que o Docker roda de tempos em tempos para saber se o app está saudável.
- **12-Factor App**: 12 boas práticas para apps na nuvem, como config por variável de ambiente e processos sem estado guardado.
