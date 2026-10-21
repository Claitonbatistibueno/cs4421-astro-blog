import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticSiteStack } from '../lib/static-site-stack';

// The stack uploads ../dist (the Astro build). The tests only need the folder to
// exist, so CI can run them without building the site first.
const distDir = path.resolve(process.cwd(), '..', 'dist');

let template: Template;

beforeAll(() => {
  fs.mkdirSync(distDir, { recursive: true });
  const app = new cdk.App();
  const stack = new StaticSiteStack(app, 'TestStaticSite', { env: { region: 'us-east-1' } });
  template = Template.fromStack(stack);
});

test('only CloudFront can read the bucket (no public read in the bucket policy)', () => {
  const policies = template.findResources('AWS::S3::BucketPolicy');
  const statements = Object.values(policies).flatMap(
    (p) => p.Properties.PolicyDocument.Statement as Array<Record<string, unknown>>,
  );
  const reads = statements.filter(
    (s) => s.Effect === 'Allow' && JSON.stringify(s.Action).includes('s3:GetObject'),
  );

  expect(reads.length).toBeGreaterThan(0);
  for (const s of reads) {
    expect(s.Principal).toEqual({ Service: 'cloudfront.amazonaws.com' });
  }
  expect(JSON.stringify(statements)).not.toContain('"Principal":"*"');
});

test('CloudFront reads the bucket through Origin Access Control', () => {
  template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: Match.objectLike({
      DefaultRootObject: 'index.html',
      Origins: Match.arrayWith([
        Match.objectLike({ OriginAccessControlId: Match.anyValue() }),
      ]),
    }),
  });
});

test('the clean-URL function runs on every viewer request', () => {
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: Match.objectLike({
      DefaultCacheBehavior: Match.objectLike({
        FunctionAssociations: [
          Match.objectLike({ EventType: 'viewer-request' }),
        ],
      }),
    }),
  });
});

test('every deploy invalidates the whole CloudFront cache', () => {
  template.hasResourceProperties('Custom::CDKBucketDeployment', {
    DistributionPaths: ['/*'],
  });
});

test('the stack outputs the public site URL', () => {
  template.hasOutput('SiteURL', {});
});

describe('clean-URL rewrite (the function code itself)', () => {
  // Pull the JavaScript out of the template and run it, so the rewrite rules are
  // tested as CloudFront will execute them, not as we think they behave.
  let rewrite: (uri: string) => string;

  beforeAll(() => {
    const fns = template.findResources('AWS::CloudFront::Function');
    const code: string = Object.values(fns)[0].Properties.FunctionCode;
    const handler = new Function(`${code}; return handler;`)() as (event: {
      request: { uri: string };
    }) => { uri: string };
    rewrite = (uri) => handler({ request: { uri } }).uri;
  });

  test.each([
    ['/', '/index.html'],
    ['/reports', '/reports/index.html'],
    ['/reports/', '/reports/index.html'],
    ['/blog/why-i-built-farm-project', '/blog/why-i-built-farm-project/index.html'],
    ['/_astro/style.css', '/_astro/style.css'],
    ['/favicon.svg', '/favicon.svg'],
  ])('%s -> %s', (uri, expected) => {
    expect(rewrite(uri)).toBe(expected);
  });
});
