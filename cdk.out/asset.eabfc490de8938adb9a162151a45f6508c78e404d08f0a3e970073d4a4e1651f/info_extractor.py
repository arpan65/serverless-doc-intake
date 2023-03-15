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
    return res

def execute(event,context):
    s3_bucket=S3_BUCKET_NAME
    s3_key="invoice2.png"
    claim_no=1234
    s3_connection=boto3.resource('s3')
    s3_object=s3_connection.Object(s3_bucket,s3_key)
    s3_response=s3_object.get()
    textract=boto3.client('textract')
    stream=io.BytesIO(s3_response['Body'].read())
    image_binary=stream.getvalue()
    response=textract.analyze_expense(Document={'Bytes':image_binary})
    #Document={'S3Object': {'Bucket': bucket, 'Name': document}}
    expense,summary=dict(),dict()
    item_counter=desc_counter=amount_counter=1
    for expense_doc in response["ExpenseDocuments"]:
        for line_item_group in expense_doc["LineItemGroups"]:
            for line_items in line_item_group["LineItems"]:
                for expense_fields in line_items["LineItemExpenseFields"]:
                    labels_values=print_labels_and_values(expense_fields)
                    if "key" in labels_values and labels_values["key"]=="ITEM":
                        expense["ITEM_"+str(item_counter)]=labels_values["value"]
                        item_counter+=1
                    elif "key" in labels_values and labels_values["key"]=="DESCRIPTION":
                        expense["DESCRIPTION_"+str(desc_counter)]=labels_values["value"]
                        desc_counter+=1    
                    elif "key" in labels_values and labels_values["key"]=="PRICE":
                        expense["PRICE_"+str(amount_counter)]=labels_values["value"]
                        amount_counter+=1      
    for summary_field in expense_doc["SummaryFields"]:
        labels_values=print_labels_and_values(summary_field)
        if "key" in labels_values:
            summary[labels_values["key"]]=labels_values["value"]
    response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "claim_no":claim_no,
        "file_name":s3_key,
        "expense": expense,
        "summary":summary
    }    
    return response