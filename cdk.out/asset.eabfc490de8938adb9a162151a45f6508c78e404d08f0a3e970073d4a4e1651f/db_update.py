# Import necessary libraries
import boto3
import os
import json
import base64

TABLE_NAME=os.getenv("TABLE_NAME")

def execute(event, context):
    # read extracted data from previous state
    claim_no=event['Payload']['claim_no']
    file_name=event['Payload']['file_name']
    expense=event['Payload']['expense']
    summary=event['Payload']['summary']
    
    # Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(TABLE_NAME)
    
    # Data to update
    item_key = {
        'invoice_id': str(claim_no)+'_'+str(file_name),
        'claim_no':claim_no
        
    }

    update_expression = 'SET expense = :expense, summary = :summary'
    expression_attribute_values = {
        ':expense': expense,
        ':summary': summary
    }
    
    # Update item in table
    response = table.update_item(
        Key=item_key,
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attribute_values
    )
    
    # Return response
    return {
        'statusCode': 200,
        'body': response
    }
