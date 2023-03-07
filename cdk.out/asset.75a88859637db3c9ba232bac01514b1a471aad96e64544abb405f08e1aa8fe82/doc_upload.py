import json


def execute(event,context):
    response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({"message": "Success"})
    }

    return response