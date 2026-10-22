# ADR-010: Deploy only after CI passes, and prove the release with a smoke test

## Status

Accepted (Date: 2026-10-21). Preparation for the Week 8 defense. PRs #63 and #64.

## Context

Before the defense I compared my pipelines with a classmate's repository and found two gaps in my static pipeline. The container pipeline already had both (ADR-009), so it was also an inconsistency between my own two pipelines.

1. **No gate.** On every push to `main`, `ci.yml` and `deploy-static.yml` started at the same time. The deploy did not wait for CI. In practice the `main-protection` ruleset (ADR-005) already blocked a red PR, so a broken change could not get in through the normal path. But that protection was only a repository setting. If someone changed or switched off the ruleset, nothing in the pipeline would stop a broken deploy.
2. **No proof.** A green deploy only meant that CloudFormation and the S3 upload finished. Nothing checked that a user could actually open the site.

## Decision

**Gate (PR #63)**
- `ci.yml` now has `workflow_call` instead of `push`, so another workflow can call it. It still runs on every PR, so the required `validate` check did not change.
- `deploy-static.yml` has a `test` job that calls CI, and `deploy` has `needs: test`. If any check fails, `deploy` is skipped.

**Smoke test (PR #64)**
- `cdk deploy` writes its outputs to `cdk-outputs.json`, and the test reads `SiteURL` from there, so the URL is never hard-coded.
- `curl -f` requests `/`, `/dashboard`, `/reports` and `/about`. Each must return 200, with retries in case CloudFront needs a few seconds.
- The home page must have the title `Farm Project`. An old or wrong build would also return 200, so the title proves it is the right site.

The static pipeline is now: PR → CI → merge → CI again on the exact commit → deploy → smoke test.

## Consequences

**Good**
- Two independent controls: the ruleset in GitHub and the gate in the pipeline. The pipeline is code, so a change to it goes through a PR and stays in the history. A setting can change without leaving any trace in the repo.
- CI runs once per merge instead of twice.
- The pipeline now checks the result (users get the right site), not just the action (files were uploaded). The first run after merge (`5f57e5f`) passed all four pages.

**Not so good**
- About one more minute between merge and live, because CI and deploy now run one after the other.
- The smoke test checks that the pages load, not that every feature on them works. It catches a broken release, not a small bug inside a page.

## Key terms (my notes)

- **Gate**: um ponto de controle no pipeline; o próximo passo só roda se o anterior passou.
- **`workflow_call`**: permite que um workflow seja chamado por outro, como uma função reaproveitável.
- **`needs`**: diz ao GitHub Actions que um job depende de outro e só começa quando ele termina com sucesso.
- **Defense in depth**: mais de uma camada de proteção, para que a falha de uma não derrube tudo.
- **Smoke test**: teste rápido logo depois do deploy para confirmar que o básico funciona no ambiente real. O nome vem do hardware: liga e vê se sai fumaça.
- **Stack output**: um valor que o CDK devolve depois do deploy (aqui, a URL do site).
