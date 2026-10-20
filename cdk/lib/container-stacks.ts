import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export const ECR_REPOSITORY_NAME = 'farm-project';

/** Amazon ECR: the registry that stores every image version (tag = git SHA or vX.Y.Z). */
export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.repository = new ecr.Repository(this, 'FarmRepository', {
      repositoryName: ECR_REPOSITORY_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true, // DevSecOps: scan each image for known CVEs
      // Keep the last 15 images: enough history to roll back, without paying for old ones.
      lifecycleRules: [{ maxImageCount: 15 }],
    });
    new cdk.CfnOutput(this, 'RepositoryUri', { value: this.repository.repositoryUri });
  }
}

interface EcsStackProps extends cdk.StackProps {
  repository: ecr.IRepository;
  imageTag: string;
}

/** Amazon ECS on Fargate behind an Application Load Balancer, with CloudWatch logs and alarms. */
export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Public subnets only and no NAT gateway: the cheapest network that still works.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'public', subnetType: ec2.SubnetType.PUBLIC }],
    });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    // Container stdout/stderr (our JSON logs) go to this CloudWatch log group.
    const logGroup = new logs.LogGroup(this, 'AppLogs', {
      logGroupName: '/farm-project/ssr',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      publicLoadBalancer: true,
      assignPublicIp: true,
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(props.repository, props.imageTag),
        containerPort: 4321,
        environment: { NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '4321', APP_VERSION: props.imageTag },
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'farm-ssr', logGroup }),
      },
      // Rolling update with zero downtime: start the new task before stopping the old one.
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      // If the new version never becomes healthy, ECS rolls back to the previous one by itself.
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: cdk.Duration.seconds(30),
    });

    service.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(15),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });
    service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '10');

    // Alarm 1: the load balancer sees no healthy task.
    new cloudwatch.Alarm(this, 'UnhealthyTasksAlarm', {
      alarmName: 'farm-project-unhealthy-tasks',
      metric: service.targetGroup.metrics.unhealthyHostCount({ period: cdk.Duration.minutes(1) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Alarm 2: server errors counted from our structured JSON logs ({ $.statusCode >= 500 }).
    const errors = new logs.MetricFilter(this, 'Http5xxFilter', {
      logGroup,
      filterPattern: logs.FilterPattern.numberValue('$.statusCode', '>=', 500),
      metricNamespace: 'FarmProject',
      metricName: 'Http5xx',
      metricValue: '1',
      defaultValue: 0,
    });
    new cloudwatch.Alarm(this, 'Http5xxAlarm', {
      alarmName: 'farm-project-http-5xx',
      metric: errors.metric({ period: cdk.Duration.minutes(1), statistic: 'Sum' }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.CfnOutput(this, 'ServiceURL', { value: `http://${service.loadBalancer.loadBalancerDnsName}` });
    new cdk.CfnOutput(this, 'ImageTag', { value: props.imageTag });
    new cdk.CfnOutput(this, 'LogGroup', { value: logGroup.logGroupName });
  }
}
