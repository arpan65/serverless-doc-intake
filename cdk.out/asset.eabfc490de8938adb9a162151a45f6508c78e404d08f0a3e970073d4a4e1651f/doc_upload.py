# Import necessary libraries
import boto3
import os
import json
import base64
s3 = boto3.client('s3')
S3_BUCKET_NAME=os.getenv("S3_BUCKET_NAME")
TABLE_NAME=os.getenv("TABLE_NAME")

def execute(event, context):
    # Get the file object from the incoming event in base64 format
    file_obj = json.loads(event['body'])['file_obj']
    file_name = json.loads(event['body'])['file_name']
    claim_no = json.loads(event['body'])['claim_number']
    # decode the base64 string
    binary_data = base64.b64decode(file_obj)
    # Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)
    # Get data from event
    item_data = {
        "claim_no":claim_no,
        "invoice_id":str(claim_no)+'_'+str(file_name),
        "file_name":file_name
    }
    # Upload the file object to S3
    s3.put_object(Bucket=S3_BUCKET_NAME, Key=file_name, Body=binary_data)
    # Insert item into table
    table.put_item(Item=item_data)
    # Create the response dictionary
    response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": "File uploaded successfully"
    }
    return response
