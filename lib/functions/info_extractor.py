from asyncio import streams
from xml.dom.minidom import Document
import boto3
import io
import json
import os

S3_BUCKET_NAME=os.getenv("S3_BUCKET_NAME")

# Takes a field as an argument and prints out the detected labels and values
# code ref : https://docs.aws.amazon.com/textract/latest/dg/analyzing-document-expense.html
def print_labels_and_values(field):
    # Only if labels are detected and returned
    res={}
    if "LabelDetection" in field:
        res["key"]= str(field.get("LabelDetection")["Text"])
    else:
        print("Label Detection - No labels returned.")
    if "ValueDetection" in field:
        res["value"]=str(field.get("ValueDetection")["Text"])
    else:
        print("Value Detection - No values returned")
    print(res)

def execute(event,context):
    s3_bucket=S3_BUCKET_NAME
    s3_key=event['key']
    s3_connection=boto3.resource('s3')
    s3_object=s3_connection.object(s3_bucket,s3_key)
    s3_response=s3_object.get()
    textract=boto3.client('textract')
    stream=io.BytesIO(s3_response['Body'].read())
    image_binary=stream.getvalue()
    response=textract.analyze_expense(Document={'Bytes':image_binary})
    #Document={'S3Object': {'Bucket': bucket, 'Name': document}}
    for expense_doc in response["ExpenseDocuments"]:
        for line_item_group in expense_doc["LineItemGroups"]:
            for line_items in line_item_group["LineItems"]:
                for expense_fields in line_items["LineItemExpenseFields"]:
                    print_labels_and_values(expense_fields)
                    print()

        print("Summary:")
    for summary_field in expense_doc["SummaryFields"]:
        print_labels_and_values(summary_field)
        print()