#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StaticSiteStack } from '../lib/static-site-stack';
import { EcrStack, EcsStack } from '../lib/container-stacks';

const app = new cdk.App();
const env = { region: 'us-east-1' };

// One CDK app, two delivery targets:
//   -c target=static     (default) S3 + CloudFront  -> deploy-static.yml on main
//   -c target=container  ECR + ECS Fargate          -> deploy-container.yml on feat/server-side-rendering
// Each pipeline only synthesises the stacks it deploys, so the static stack
// never needs dist/ from the container build and the reverse.
const target = app.node.tryGetContext('target') ?? 'static';

if (target === 'static') {
  new StaticSiteStack(app, 'StaticSiteStack', { env });
} else {
  const ecrStack = new EcrStack(app, 'FarmEcrStack', { env });
  new EcsStack(app, 'FarmEcsStack', {
    env,
    repository: ecrStack.repository,
    imageTag: app.node.tryGetContext('imageTag') ?? 'latest',
  });
}
