// Import necessary libraries
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as glue from 'aws-cdk-lib/aws-glue';
import { StackConfiguration } from './configs/stack-configuration';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Cors,LambdaIntegration,RestApi} from 'aws-cdk-lib/aws-apigateway'
import { StateMachine,Errors,Choice } from 'aws-cdk-lib/aws-stepfunctions';
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
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';


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
  
  // creating the destination table to hold extracted data 
  const invoiceTable=new dynamodb.Table(this,'invoice-extract',{
    partitionKey :{name:"invoice_id",type:dynamodb.AttributeType.STRING},
    sortKey:{name:"claim_no",type:dynamodb.AttributeType.STRING},
    tableName:"invoice-extract-table",
    removalPolicy:RemovalPolicy.DESTROY
  })



  // create a lambda role - to upload files to S3 bucket
  const lambdabasicRole = new Role(this, 'doc-upload-role', {
    roleName:"lambda-doc-upload-role",
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies:[
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
    ]
  });
  
  const docUploadlambdaRole=lambdabasicRole
  // add permission to upload files to the bucket
  docUploadlambdaRole.addToPolicy(new PolicyStatement({
    effect:Effect.ALLOW,
    resources:['*'],
    actions:['s3:*']
  }))

  const docExtractorlambdaRole=lambdabasicRole
  // add permission to upload files to the bucket arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess 
  docExtractorlambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess"))
  docExtractorlambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonTextractFullAccess"))

  // create a lambda function to upload files to S3
  const docuploadLambda = new lambda.Function(this,'doc-upload-lambda',{
    functionName:"doc-upload-lambda",
    runtime:Runtime.PYTHON_3_9,
    handler:"doc_upload.execute",
    code:Code.fromAsset(path.join(__dirname,'./functions')),
    role:docUploadlambdaRole,
    environment:{
      "S3_BUCKET_NAME":docIntakeBucket.bucketName,
      "TABLE_NAME":invoiceTable.tableName
    }
  })
  invoiceTable.grantReadWriteData(docUploadlambdaRole)

// create a lambda function to upload files to S3
const docExtractorLambda = new lambda.Function(this,'doc-extractor-lambda',{
  functionName:"doc-extractor-lambda",
  runtime:Runtime.PYTHON_3_9,
  handler:"info_extractor.execute",
  code:Code.fromAsset(path.join(__dirname,'./functions')),
  role:docExtractorlambdaRole,
  environment:{
    "S3_BUCKET_NAME":docIntakeBucket.bucketName
  }
})

// create a lambda function to update database 
const dbUpdateHandlerLambda = new lambda.Function(this,'db-update-handler-lambda',{
  functionName:"db-update-handler-lambda",
  runtime:Runtime.PYTHON_3_9,
  handler:"db_update.execute",
  code:Code.fromAsset(path.join(__dirname,'./functions')),
  role:docUploadlambdaRole,
  environment:{
    "TABLE_NAME":invoiceTable.tableName
  }
})
invoiceTable.grantReadWriteData(docUploadlambdaRole)
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

  // defining the statemachine
  const retryProps={
    intervalSeconds:10,
    maxAttempts:5,
    backoffRate:1.0,
    errors:['Lambda.Unknown','States.Timeout']
  }
  const catchProps={
    errors:[Errors.ALL],
    resultPath:"$.error_Payload"
  }

  const errorHandlingTaskForDocExtract =new LambdaInvoke(this,'docExtractErrorHandlingTask',{
    lambdaFunction:docExtractorLambda,
    inputPath:"$",
    timeout:Duration.seconds(20)
  })
  const errorHandlingTaskForDbUpdate =new LambdaInvoke(this,'dbUpdateErrorHandlingTask',{
    lambdaFunction:docExtractorLambda,
    inputPath:"$",
    timeout:Duration.seconds(20)
  })
  
  const docExtractTask =new LambdaInvoke(this,'docExtractTask',{
    lambdaFunction:docExtractorLambda,
    inputPath:"$",
    timeout:Duration.seconds(20)
  })
  docExtractTask.addCatch(errorHandlingTaskForDocExtract,catchProps)
  docExtractTask.addRetry(retryProps)

  const dbUpdateTask =new LambdaInvoke(this,'dbUpdateTask',{
    lambdaFunction:dbUpdateHandlerLambda,
    inputPath:"$",
    timeout:Duration.seconds(20)
  })
  dbUpdateTask.addCatch(errorHandlingTaskForDbUpdate,catchProps)
  dbUpdateTask.addRetry(retryProps)
  const taskChain=docExtractTask.next(dbUpdateTask)

  const docProcessorStatemachine = new StateMachine(this,'docProcessorStateMachine',{
    definition:taskChain,
    timeout:Duration.seconds(20)
  })

  }
}
