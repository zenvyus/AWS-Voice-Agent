"""Structured JSON logging utility for Lambda functions.

Usage:
    from structured_logger import get_logger

    def handler(event, context):
        logger = get_logger(service="speech-quality-gate", event=event)
        logger.info("Processing transcript", metadata={"contactId": event.get("contactId")})
        try:
            ...
        except Exception as e:
            logger.error("Failed to process", error=e)
"""

import json
import traceback
import uuid
from datetime import datetime, timezone


class StructuredLogger:
    """Structured JSON logger with correlation ID support."""

    def __init__(self, service: str, correlation_id: str | None = None):
        self.service = service
        self.correlation_id = correlation_id or str(uuid.uuid4())

    def _emit(self, level: str, message: str, metadata: dict | None = None, error: Exception | None = None) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": level,
            "correlationId": self.correlation_id,
            "service": self.service,
            "message": message,
        }

        if metadata:
            entry["metadata"] = metadata

        if error:
            entry["stackTrace"] = traceback.format_exception(type(error), error, error.__traceback__)
            entry["errorMessage"] = str(error)

        log_line = json.dumps(entry, default=str)
        print(log_line)
        return log_line

    def info(self, message: str, metadata: dict | None = None) -> str:
        return self._emit("INFO", message, metadata=metadata)

    def warn(self, message: str, metadata: dict | None = None) -> str:
        return self._emit("WARN", message, metadata=metadata)

    def error(self, message: str, error: Exception | None = None, metadata: dict | None = None) -> str:
        return self._emit("ERROR", message, metadata=metadata, error=error)

    def debug(self, message: str, metadata: dict | None = None) -> str:
        return self._emit("DEBUG", message, metadata=metadata)


def get_logger(service: str, event: dict | None = None) -> StructuredLogger:
    """Create a structured logger, extracting correlationId from the event if present."""
    correlation_id = None
    if event:
        correlation_id = (
            event.get("correlationId")
            or event.get("headers", {}).get("x-correlation-id")
            or event.get("requestContext", {}).get("requestId")
        )
    return StructuredLogger(service=service, correlation_id=correlation_id)
