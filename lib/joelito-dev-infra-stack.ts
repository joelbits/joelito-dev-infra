import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, S3OriginAccessControl, Signing, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, CnameRecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface SiteProps extends cdk.StackProps {
  domainName: string;
}

export class JoelitoDevInfraStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: SiteProps,
  ) {
    super(scope, id, props);

    // Get the certificate ARN from context
    const certificateArn = this.node.tryGetContext('JoelitoDevCertArn');

    // Ensure the certificate ARN is available
    if (!certificateArn) {
      throw new Error('Certificate ARN must be provided via context.');
    }

    // Import the certificate using the ARN passed via context
    const certificate = Certificate.fromCertificateArn(this, 'JoelitoDevImportedCert', certificateArn);

    // Get Route 53 Hosted Zone
    const hostedZone = PublicHostedZone.fromLookup(this, "HostedZone", {
      domainName: props.domainName,
    });

    // Create an S3 bucket for website hosting
    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // Not recommended for production
      autoDeleteObjects: true, // Not recommended for production
    });

    const oac = new S3OriginAccessControl(this, 'BucketOAC', {
      signing: Signing.SIGV4_NO_OVERRIDE
    });

    const s3Origin = S3BucketOrigin.withOriginAccessControl(websiteBucket, {
      originAccessControl: oac
    });

    // Create a CloudFront distribution
    const distribution = new Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [ props.domainName ],
      certificate: certificate,
    });

    // Create a Route 53 alias record pointing to CloudFront
    new ARecord(this, 'SiteAliasRecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      recordName: props.domainName,
    });

    // Optionally, add a CNAME for "www" subdomain redirect to "yourdomain.com"
    new CnameRecord(this, 'SiteAliasWwwwRecord', {
      zone: hostedZone,
      recordName: 'www',
      domainName: props.domainName,
    });

    // Output the name servers
    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers || ['none']),
    });

  }
}
