import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ECR_REPOSITORY_NAME, EcrStack, EcsStack } from '../lib/container-stacks';

// Same wiring as cdk/bin/cdk.ts with -c target=container.
const app = new cdk.App();
const env = { region: 'us-east-1' };
const ecrStack = new EcrStack(app, 'TestEcr', { env });
const ecsStack = new EcsStack(app, 'TestEcs', {
  env,
  repository: ecrStack.repository,
  imageTag: 'v1.0.0',
});
const ecr = Template.fromStack(ecrStack);
const ecs = Template.fromStack(ecsStack);

describe('ECR (image registry)', () => {
  test('scans every pushed image for known vulnerabilities', () => {
    ecr.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: ECR_REPOSITORY_NAME,
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });

  test('keeps the last 15 images (the rollback history)', () => {
    const repo = Object.values(ecr.findResources('AWS::ECR::Repository'))[0];
    const policy = JSON.parse(repo.Properties.LifecyclePolicy.LifecyclePolicyText);
    expect(policy.rules[0].selection).toMatchObject({
      countType: 'imageCountMoreThan',
      countNumber: 15,
    });
  });
});

describe('ECS service (zero-downtime rollout)', () => {
  test('rolling update keeps the old task until the new one is healthy', () => {
    ecs.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 1,
      DeploymentConfiguration: Match.objectLike({
        MinimumHealthyPercent: 100,
        MaximumPercent: 200,
      }),
    });
  });

  test('the circuit breaker rolls back a version that never becomes healthy', () => {
    ecs.hasResourceProperties('AWS::ECS::Service', {
      DeploymentConfiguration: Match.objectLike({
        DeploymentCircuitBreaker: { Enable: true, Rollback: true },
      }),
      HealthCheckGracePeriodSeconds: 30,
    });
  });

  test('the load balancer checks /api/health every 15 s and expects 200', () => {
    ecs.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/api/health',
      HealthCheckIntervalSeconds: 15,
      Matcher: { HttpCode: '200' },
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 2,
      TargetGroupAttributes: Match.arrayWith([
        { Key: 'deregistration_delay.timeout_seconds', Value: '10' },
      ]),
    });
  });

  test('runs the image tag it was given, with 12-Factor config in the environment', () => {
    ecs.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '256',
      Memory: '512',
      ContainerDefinitions: [
        Match.objectLike({
          Image: Match.objectLike({ 'Fn::Join': Match.arrayWith([Match.arrayWith([':v1.0.0'])]) }),
          PortMappings: [Match.objectLike({ ContainerPort: 4321 })],
          Environment: Match.arrayWith([
            { Name: 'NODE_ENV', Value: 'production' },
            { Name: 'HOST', Value: '0.0.0.0' },
            { Name: 'PORT', Value: '4321' },
            { Name: 'APP_VERSION', Value: 'v1.0.0' },
          ]),
        }),
      ],
    });
  });
});

describe('network cost', () => {
  test('uses no NAT gateway (public subnets only)', () => {
    ecs.resourceCountIs('AWS::EC2::NatGateway', 0);
  });
});

describe('observability (CloudWatch)', () => {
  test('container logs go to /farm-project/ssr', () => {
    ecs.hasResourceProperties('AWS::Logs::LogGroup', { LogGroupName: '/farm-project/ssr' });
  });

  test('a metric filter counts HTTP 5xx from the JSON logs', () => {
    ecs.hasResourceProperties('AWS::Logs::MetricFilter', {
      FilterPattern: '{ $.statusCode >= 500 }',
      MetricTransformations: [
        Match.objectLike({ MetricNamespace: 'FarmProject', MetricName: 'Http5xx' }),
      ],
    });
  });

  test('both alarms used in the rollback drill exist', () => {
    ecs.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'farm-project-http-5xx' });
    ecs.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'farm-project-unhealthy-tasks' });
  });
});
