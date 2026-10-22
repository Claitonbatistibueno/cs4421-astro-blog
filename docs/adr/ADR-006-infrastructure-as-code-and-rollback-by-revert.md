# ADR-006: Static hosting on S3 + CloudFront with AWS CDK, and rollback by `git revert`

## Status

Accepted (Date: 2026-09-29). Week 4, Milestone 1. CloudFront clean-URL function added on 2026-10-20. Rollback Drill 1 run on 2026-10-20 (PRs #51, #53).

## Context

Week 4 was about cloud providers, Infrastructure as Code and putting the site live. The site was still static (only HTML, CSS and images), so it did not need a server, just somewhere to store the files and deliver them fast.

I also had to show a deploy and then a rollback in the git history, so I needed a way to undo a bad release that did not depend on me clicking around in the AWS console.

## Options considered

**Creating the infrastructure**

| Option | Verdict |
|---|---|
| ClickOps (create the bucket and CDN by hand in the console) | Rejected: not repeatable, no history, easy to forget a setting |
| Terraform | Rejected: good tool, but a new language (HCL) on top of everything else |
| CloudFormation YAML | Rejected: same result as CDK but long and hard to read |
| **AWS CDK in TypeScript** | **Accepted**: same language as the site, generates CloudFormation, can be tested (PR #61) |

**Rolling back a bad release**

| Option | Verdict |
|---|---|
| `git reset` + force push | Rejected: rewrites history, and `main` is protected anyway |
| Fix by hand in S3 | Rejected: the code and the live site would no longer match |
| **`git revert` through a PR** | **Accepted** |

## Decision

- `StaticSiteStack` (in `cdk/lib/static-site-stack.ts`) creates:
  - a **private** S3 bucket for the files;
  - a CloudFront distribution in front of it, and only CloudFront can read the bucket (Origin Access Control);
  - a `BucketDeployment` that uploads `dist/` and invalidates `/*` on CloudFront on every deploy, so users get the new version straight away;
  - a small CloudFront Function that turns `/reports` into `/reports/index.html`. Without it every page except the home returned AccessDenied, because a private S3 bucket only knows exact file names.
- `deploy-static.yml` builds the site and runs `cdk deploy` on every merge to `main`.
- To roll back, I use the **Revert** button on the PR that caused the problem. GitHub creates a new PR that undoes it, CI runs, I merge, and the same pipeline deploys the previous version.

## Rollback Drill 1 (what happened)

1. PR #51 added a red "BROKEN DEPLOY" banner to the home page. CI passed, because the code was valid.
2. I saw it live on CloudFront.
3. Revert on PR #51 → PR #53 → merged.
4. The deploy rebuilt the old version, uploaded it and cleared the CDN cache. The site was back in about 3 minutes.

## Consequences

**Good**
- The whole infrastructure is in the repo. If everything is deleted, `cdk deploy` creates it again the same way.
- Static hosting is the cheapest option: storage plus CDN, no server running all day.
- `git revert` keeps both the mistake and the fix in the history, which is exactly the evidence the drill asks for.

**Not so good**
- The rollback still rebuilds and re-uploads the site (about 3 minutes), and users see the bug during that time. The container rollback in Week 7 is faster (ADR-009).
- The bucket is private only because AWS blocks public access on new buckets by default. My code does not say it explicitly yet. I found this when writing the CDK tests.
- Deploys use long-lived AWS access keys stored as GitHub secrets. OIDC with short-lived credentials would be safer.

## Key terms (my notes)

- **IaC (Infrastructure as Code)**: a infraestrutura (bucket, CDN, permissões) escrita em código e versionada no Git, em vez de criada com cliques.
- **AWS CDK**: biblioteca que escreve infraestrutura em TypeScript e gera um template do CloudFormation.
- **CloudFormation**: o serviço da AWS que lê o template e cria ou atualiza os recursos.
- **S3**: armazenamento de arquivos da AWS. Guarda e entrega arquivos, mas não executa código.
- **CloudFront (CDN)**: rede de servidores pelo mundo que guarda cópias do site perto do usuário, para carregar mais rápido.
- **OAC (Origin Access Control)**: permissão que deixa só o CloudFront ler o bucket. Ninguém acessa o S3 direto.
- **Invalidation**: manda o CloudFront apagar as cópias antigas em cache, para servir a versão nova.
- **`git revert`**: cria um commit novo que desfaz um commit anterior, sem apagar o histórico.
