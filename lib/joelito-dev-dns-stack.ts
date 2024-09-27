import * as cdk from 'aws-cdk-lib';
import { MxRecord, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface SiteProps extends cdk.StackProps{
  domainName: string
  emailProviderMxRecord: string
}

export class JoelitoDevDnsStack extends cdk.Stack {
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

    // Output the name servers
    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', hostedZone.hostedZoneNameServers ?? ['NaN']),
    });

  }
}
