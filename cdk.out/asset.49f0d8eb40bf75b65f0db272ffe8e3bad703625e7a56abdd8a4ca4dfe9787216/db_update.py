# Import necessary libraries
import boto3
import os
import json
import base64

TABLE_NAME=os.getenv("TABLE_NAME")

def execute(event, context):
    # read extracted data from previous state
    claim_no=event['claim_no']
    file_name=event['file_name']
    expense=event['expense']
    summary=event['summary']
    
    # Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table_name = 'example_table'
    table = dynamodb.Table(table_name)
    
    # Data to update
    item_key = {
        'invoice_id': str(claim_no)+'_'+str(file_name)
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
