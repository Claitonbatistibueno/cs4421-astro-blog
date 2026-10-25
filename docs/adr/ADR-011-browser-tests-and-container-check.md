# ADR-011: Browser tests with Playwright and a container check on every pull request

## Status

Accepted (Date: 2026-10-23). Preparation for the Week 8 defense.

## Context

My test pyramid had a base (unit tests), a middle (component render tests and CDK assertions) and a smoke test in production, but nothing in between that opened the real site in a browser. The instructor added Playwright tests with axe accessibility scans to his repository on 22/10, and a classmate's repository builds the Docker image and waits for it to be healthy on every pull request. Looking at both, I found two gaps in mine:

1. **No browser tests.** Lighthouse gave 100 in accessibility, but only on the pages I tested by hand, and only once. Nothing stopped a later change from breaking it.
2. **The container was only built after the merge.** `deploy-container.yml` builds the image when the SSR branch changes. A broken Dockerfile or a server that never becomes healthy was found in the rollout, not in the pull request.

## Options considered

| Option | Verdict |
|---|---|
| Keep testing pages by hand with Lighthouse | Rejected: not repeatable, and not part of the gate |
| Cypress | Rejected: good tool, but Playwright tests several browsers and device sizes with one API, and it is what the instructor uses |
| **Playwright + axe-core** | **Accepted** |
| Build the image only in the deploy pipeline (as before) | Rejected: the problem is found too late |
| **Build and run the image in a pull request workflow** | **Accepted** |

## Decision

**Browser tests (`e2e/site.spec.ts`, `playwright.config.ts`)**
- Playwright starts `astro preview` on the production build and runs every test twice: on a desktop Chromium and on a phone-sized one (Pixel 7).
- For each page in the navigation: HTTP 200, the *Farm Project* title, exactly one `<h1>`, no horizontal scroll, every image loaded, no console errors, and no WCAG 2.1 A/AA violations in an axe scan.
- Journeys: the main navigation reaches every section, a farm update opens from the list, an unknown page returns 404, the RSS feed and the sitemap exist.
- They run inside the required `validate` job, so they block the merge and also run in the deploy gate (ADR-010). On failure, the report and traces are kept as an artifact.

**Container check (`container-ci.yml`, SSR branch)**
- On every pull request into `feat/server-side-rendering`: build the image with the same command as the deploy pipeline, run it, wait for the Docker `HEALTHCHECK` to report `healthy`, call the health endpoints, the home page and the dashboard, and check that a log line is JSON with the expected keys.

## Consequences

**Good**
- The tests found a real problem on their first run: the report tables are in scrollable boxes that a keyboard user could not reach (axe rule `scrollable-region-focusable`). I fixed it with `tabindex="0"`, `role="region"` and a label, and now a test keeps it fixed.
- The pyramid is complete: unit → component → infrastructure → browser → container → smoke test in production.
- A broken Dockerfile now fails in the PR, in about a minute, instead of in a 5–7 minute rollout.

**Not so good**
- CI is about 1–2 minutes longer (browser install and 30 tests).
- Browser tests are slower and more fragile than unit tests, so I keep them few and focused on what a visitor sees.
- Automated accessibility checks find about a third of real problems; they do not replace testing with a screen reader.

## Key terms (my notes)

- **E2E (end-to-end) test**: teste que abre o site num navegador de verdade e faz o que o usuário faria (abrir página, clicar, ler).
- **Playwright**: ferramenta que controla navegadores (Chromium, Firefox, WebKit) por código.
- **axe-core**: biblioteca que varre a página e lista problemas de acessibilidade pelas regras WCAG.
- **WCAG 2.1 A/AA**: as regras internacionais de acessibilidade na web; A e AA são os níveis exigidos na maioria dos países.
- **Pirâmide de testes**: muitos testes rápidos na base (unit), menos no meio, poucos e lentos no topo (E2E).
- **Docker HEALTHCHECK**: comando que o Docker roda de tempos em tempos dentro do container para saber se ele está saudável.
