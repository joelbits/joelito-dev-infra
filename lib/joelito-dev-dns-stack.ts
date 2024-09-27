import * as cdk from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { MxRecord, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface SiteProps extends cdk.StackProps{
  domainName: string
  emailProviderMxRecord: string
}

export class JoelitoDevDnsStack extends cdk.Stack {
  public readonly certificateArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: SiteProps,
  ) {
    super(scope, id, props);

    // Create a new Route 53 hosted zone
    const hostedZone = new PublicHostedZone(this, 'JoelitoDevHostedZone', {
      zoneName: props.domainName,
    });

    // Create an ACM Certificate
    const certificate = new Certificate(this, 'JoelitoDevSiteCertificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: CertificateValidation.fromDns(hostedZone),
    });

    // Add MX and TXT records for your email provider
    new MxRecord(this, 'JoelitoDevEmailMxRecord', {
      zone: hostedZone,
      values: [
        {
          priority: 10,
          hostName: props.emailProviderMxRecord,
        },
      ],
    });

    // Export the certificate's ARN to be referenced in other stacks
    this.certificateArn = certificate.certificateArn;

    // Output the site certificate ARN
    new cdk.CfnOutput(this, 'JoelitoDevCertArnExport', {
      value: certificate.certificateArn,
      exportName: 'JoelitoDevCertArn',
    });

    // Output the name servers
    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers ?? ['NaN']),
    });

  }
}
