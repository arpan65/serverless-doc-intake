import boto3
import os
import json
s3 = boto3.client('s3')
S3_BUCKET_NAME=os.getenv("S3_BUCKET_NAME")

def execute(event, context):
    # Get the file object from the incoming event
    file_obj = json.loads(event['body'])['file_obj']
    file_name = json.loads(event['body'])['file_name']

    # Upload the file object to S3
    s3.upload_fileobj(file_obj, S3_BUCKET_NAME, file_name)

    # Create the response dictionary
    response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": "File uploaded successfully"
    }

    return response
