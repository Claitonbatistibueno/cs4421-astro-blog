# ADR-005: CI quality gate with GitHub Actions and a protected `main`

## Status

Accepted (Date: 2026-09-29). Week 3. Dependabot added on 2026-10-21 (PR #56).

## Context

Week 3 was about shift-left: finding problems as early as possible, when they are cheap to fix, instead of finding them in production. The lab asked for linting, type checking, tests and a CI workflow.

My first CI workflow (Week 3) was green, but it was not testing anything. It ran `npm run lint --if-present` and `npm run test:unit --if-present`, and the scripts did not exist yet, so every step was skipped and the run passed. I only noticed when I looked at the logs. A green check that checks nothing is worse than no check, because it gives a false sense of safety.

## Options considered

| Option | Verdict |
|---|---|
| Jenkins | Rejected: I would have to host and maintain a server |
| GitLab CI / CircleCI | Rejected: my code is on GitHub, so it would be one more integration |
| **GitHub Actions** | **Accepted**: runs next to the code, free for public repos, workflow is a YAML file in the repo |

## Decision

1. I added the real tools first, one PR each: ESLint (PR #12), Vitest (PR #13), then the CI workflow that runs them (PR #14).
2. `ci.yml` runs on every pull request to `main`, in this order: `npm ci` → `npm run lint` → `npm run check` (`astro check`, types) → `npm run test:unit` → `npm run build` → CDK tests (added later, ADR-006).
3. A ruleset called `main-protection` blocks any merge into `main` unless:
   - it comes through a pull request,
   - the `validate` check is green,
   - the branch is up to date with `main`.
   Nobody can bypass it, not even me as the owner.
4. Node 22 is used everywhere (laptop, CI, deploy, container), so a test never passes on one version and fails on another (PR #11).
5. DevSecOps: Dependabot opens a PR every week with grouped updates for npm, the CDK project and the GitHub Actions themselves (PR #56). Those PRs go through the same CI.

## Consequences

**Good**
- Broken code is stopped at the PR, before it reaches users. A failure costs one minute of CI, not an outage.
- The `validate` check is the same for everyone and every change, so "it works on my machine" is not enough.
- Dependency updates are small and tested, instead of one big painful update at the end.

**Not so good**
- Each PR waits about a minute for CI.
- "Up to date with `main`" means that after one merge, the other open PRs must click **Update branch** and run CI again.
- CI can only catch what the tests check. In Rollback Drill 1 a wrong but valid change passed CI (ADR-006). Tests reduce risk, they do not remove it.

## Key terms (my notes)

- **CI (Continuous Integration)**: a cada mudança, o código é automaticamente instalado, verificado, testado e compilado.
- **Shift-left**: trazer os testes e a segurança para o começo do processo (para a "esquerda" da linha do tempo), onde o erro é mais barato.
- **Linting (ESLint)**: análise estática que encontra erros e más práticas no código sem rodar o programa.
- **Type check (`astro check`)**: verifica se os tipos do TypeScript batem, por exemplo passar texto onde se espera número.
- **Unit test (Vitest)**: testa uma função pequena isolada, com entrada e saída conhecidas.
- **Ruleset / branch protection**: regra do GitHub que impede o merge no `main` se as condições não forem cumpridas.
- **Dependabot**: robô do GitHub que abre PRs para atualizar dependências com versões novas ou com correções de segurança.
- **DevSecOps**: segurança como parte automática do pipeline, e não uma etapa no final.
