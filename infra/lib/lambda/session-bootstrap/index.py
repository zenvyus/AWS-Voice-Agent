"""Session bootstrap Lambda — creates a DynamoDB session row when a call arrives."""

import json
import os
import time
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("SESSIONS_TABLE_NAME", "voice-agent-sessions")
TTL_HOURS = 24


def handler(event, context):
    """Handle Connect invocation to bootstrap a call session."""
    logger.info("Session bootstrap invoked: %s", json.dumps(event))

    details = event.get("Details", {})
    contact_data = details.get("ContactData", {})
    contact_id = contact_data.get("ContactId", "unknown")
    attributes = contact_data.get("Attributes", {})

    caller_phone = attributes.get("callerPhone", contact_data.get("CustomerEndpoint", {}).get("Address", "unknown"))

    now = int(time.time())
    ttl = now + (TTL_HOURS * 3600)

    table = dynamodb.Table(TABLE_NAME)
    table.put_item(
        Item={
            "contactId": contact_id,
            "callerPhone": caller_phone,
            "startTime": now,
            "status": "active",
            "ttl": ttl,
        }
    )

    logger.info("Session created for contactId=%s", contact_id)

    return {
        "statusCode": 200,
        "sessionId": contact_id,
    }
