// Import necessary libraries
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import { StackConfiguration } from './configs/stack-configuration';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Cors,LambdaIntegration,RestApi} from 'aws-cdk-lib/aws-apigateway'
import {
  Role,
  ManagedPolicy,
  ServicePrincipal,
  Policy,
  PolicyStatement,
  Effect,
  AnyPrincipal,
  PolicyDocument,
} from "aws-cdk-lib/aws-iam";
import * as path from "path";
import dynamodb=require('aws-cdk-lib/aws-dynamodb');
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';


// Define the resources
export class InitStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
  super(scope, id, props);
  
  // create a S3 bucket to hold the raw documents
  const docIntakeBucket = new Bucket(this,'doc-intake-bucket',{
  bucketName:"loss-intake-bucket-non-prod",
  blockPublicAccess:BlockPublicAccess.BLOCK_ALL,
  versioned:false,
  removalPolicy:RemovalPolicy.DESTROY
  })
  // add bucket policy
  //docIntakeBucket.addToResourcePolicy(new PolicyStatement({
   // effect:Effect.ALLOW,
    //principals:[new AnyPrincipal()],
    //actions:["s3:*"],
    //resources:["*"]
  //}))



  // create a lambda role - to upload files to S3 bucket
  const docUploadlambdaRole = new Role(this, 'doc-upload-role', {
    roleName:"lambda-doc-upload-role",
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies:[
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
    ]
  });
  
  // add permission to upload files to the bucket
  docUploadlambdaRole.addToPolicy(new PolicyStatement({
    effect:Effect.ALLOW,
    resources:['*'],
    actions:['s3:*']
  }))

  // create a lambda function to upload files to S3
  const docuploadLambda = new lambda.Function(this,'doc-upload-lambda',{
    functionName:"doc-upload-lambda",
    runtime:Runtime.PYTHON_3_9,
    handler:"doc_upload.execute",
    code:Code.fromAsset(path.join(__dirname,'./functions')),
    role:docUploadlambdaRole,
    environment:{
      "S3_BUCKET_NAME":docIntakeBucket.bucketName
    }
  })
  
  // REST Api resource
  const docIntakeApi = new RestApi(this, 'doc-intake-api',{deployOptions:{stageName:"dev"}});
  
    // Create an usage plan for the api gateway
  const plan = docIntakeApi.addUsagePlan('DocIntakeUsagePlan', {
    name: 'doc-intake-usage-plan',
    throttle: {
      rateLimit: 10,
      burstLimit: 2
    }
  });
  plan.addApiStage({stage:docIntakeApi.deploymentStage})
  
  // Add API key for security
  const key = docIntakeApi.addApiKey('ApiKey');
  plan.addApiKey(key);
  // Add resource and POST method to handle document upload
  const v1 = docIntakeApi.root.addResource('v1');
  const uploadResource = v1.addResource('upload');
  uploadResource.addMethod('POST',new LambdaIntegration(docuploadLambda),{apiKeyRequired:true})

  }
}
