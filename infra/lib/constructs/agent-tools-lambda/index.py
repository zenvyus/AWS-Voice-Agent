"""
Bedrock Agent Action Group Lambda — Airline Tools (placeholder stubs).
Handles tool invocations from the Bedrock Agent and returns structured responses.
"""

import json
import os
import uuid


def handler(event, context):
    """Handle Bedrock Agent action group invocations."""
    agent = event.get("agent", {})
    action_group = event.get("actionGroup", "")
    api_path = event.get("apiPath", "")
    http_method = event.get("httpMethod", "GET")
    parameters = event.get("parameters", [])
    session_id = event.get("sessionId", "")

    print(
        json.dumps(
            {
                "level": "INFO",
                "message": "Action group invocation",
                "actionGroup": action_group,
                "apiPath": api_path,
                "httpMethod": http_method,
                "sessionId": session_id,
                "environment": os.environ.get("ENVIRONMENT", "unknown"),
            }
        )
    )

    param_map = {p["name"]: p.get("value", "") for p in parameters}

    if api_path == "/searchFlights":
        body = _search_flights(param_map)
    elif api_path == "/createBooking":
        body = _create_booking(param_map)
    elif api_path == "/getBooking":
        body = _get_booking(param_map)
    elif api_path == "/selectSeat":
        body = _select_seat(param_map)
    else:
        body = {"error": f"Unknown action: {api_path}", "message": "Action not implemented"}

    response = {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": action_group,
            "apiPath": api_path,
            "httpMethod": http_method,
            "httpStatusCode": 200,
            "responseBody": {"application/json": {"body": json.dumps(body)}},
        },
    }

    print(json.dumps({"level": "INFO", "message": "Action group response", "apiPath": api_path}))
    return response


def _search_flights(params):
    """Stub: return sample flight results."""
    origin = params.get("origin", "JFK")
    destination = params.get("destination", "LAX")
    date = params.get("date", "2026-06-01")
    return {
        "flights": [
            {
                "flightNumber": "VA101",
                "origin": origin,
                "destination": destination,
                "date": date,
                "departureTime": "08:00",
                "arrivalTime": "11:30",
                "price": 299.00,
                "seatsAvailable": 42,
            },
            {
                "flightNumber": "VA205",
                "origin": origin,
                "destination": destination,
                "date": date,
                "departureTime": "14:00",
                "arrivalTime": "17:30",
                "price": 349.00,
                "seatsAvailable": 18,
            },
        ]
    }


def _create_booking(params):
    """Stub: return sample booking confirmation."""
    order_id = uuid.uuid4().hex[:6].upper()
    return {
        "orderId": order_id,
        "flightNumber": params.get("flightNumber", "VA101"),
        "passengerName": params.get("passengerName", "John Doe"),
        "status": "CONFIRMED",
        "message": f"Booking {order_id} confirmed.",
    }


def _get_booking(params):
    """Stub: return sample booking details."""
    order_id = params.get("orderId", "ABC123")
    return {
        "orderId": order_id,
        "flightNumber": "VA101",
        "origin": "JFK",
        "destination": "LAX",
        "date": "2026-06-01",
        "departureTime": "08:00",
        "passengerName": "John Doe",
        "seat": "12A",
        "status": "CONFIRMED",
    }


def _select_seat(params):
    """Stub: return seat assignment confirmation."""
    return {
        "orderId": params.get("orderId", "ABC123"),
        "seat": params.get("seatNumber", "14F"),
        "status": "ASSIGNED",
        "message": f"Seat {params.get('seatNumber', '14F')} assigned to booking {params.get('orderId', 'ABC123')}.",
    }
