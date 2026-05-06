"""
Speech Quality Gate Lambda

Applies four sequential filters to STT transcript segments:
  Gate 1: Minimum length
  Gate 2: Confidence threshold
  Gate 3: Entropy check (Shannon)
  Gate 4: Gibberish detection (dictionary match ratio)

Returns PASS or REJECT with the failing gate and reason.
"""

import json
import math
import os
import time
import logging
from collections import Counter

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cloudwatch = boto3.client("cloudwatch")

# Configurable thresholds from environment
MIN_LENGTH_THRESHOLD = int(os.environ.get("MIN_LENGTH_THRESHOLD", "3"))
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.6"))
ENTROPY_THRESHOLD = float(os.environ.get("ENTROPY_THRESHOLD", "1.5"))
GIBBERISH_THRESHOLD = float(os.environ.get("GIBBERISH_THRESHOLD", "0.4"))
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

# Basic English word set for gibberish detection (top ~1000 common words)
# In production, load from S3 or bundled file
COMMON_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
    "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "get", "got", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't",
    "it", "its", "itself", "just", "let", "like", "me", "might", "more",
    "most", "must", "my", "myself", "no", "nor", "not", "now", "of", "off",
    "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out",
    "over", "own", "same", "she", "should", "shouldn't", "so", "some",
    "such", "than", "that", "the", "their", "theirs", "them", "themselves",
    "then", "there", "these", "they", "this", "those", "through", "to",
    "too", "under", "until", "up", "us", "very", "was", "wasn't", "we",
    "were", "weren't", "what", "when", "where", "which", "while", "who",
    "whom", "why", "will", "with", "won't", "would", "wouldn't", "you",
    "your", "yours", "yourself", "yourselves", "yes", "no", "okay", "ok",
    "please", "thank", "thanks", "hello", "hi", "bye", "goodbye", "sorry",
    "help", "need", "want", "book", "flight", "seat", "ticket", "cancel",
    "change", "check", "status", "time", "date", "name", "number", "airport",
    "arrive", "depart", "departure", "arrival", "boarding", "pass", "gate",
    "terminal", "baggage", "luggage", "bag", "class", "first", "business",
    "economy", "window", "aisle", "middle", "row", "confirm", "confirmation",
    "reservation", "reference", "code", "order", "pay", "payment", "price",
    "cost", "fee", "refund", "credit", "card", "today", "tomorrow",
    "yesterday", "morning", "afternoon", "evening", "night", "monday",
    "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december", "one", "two",
    "three", "four", "five", "six", "seven", "eight", "nine", "ten",
}


def shannon_entropy(text: str) -> float:
    """Calculate Shannon entropy of character distribution."""
    if not text:
        return 0.0
    counts = Counter(text.lower())
    length = len(text)
    entropy = 0.0
    for count in counts.values():
        p = count / length
        if p > 0:
            entropy -= p * math.log2(p)
    return entropy


def dictionary_match_ratio(transcript: str) -> float:
    """Fraction of words that match the common English word set."""
    words = transcript.lower().split()
    if not words:
        return 0.0
    matches = sum(1 for w in words if w.strip(".,!?;:'\"") in COMMON_WORDS)
    return matches / len(words)


def emit_metric(gate: int, result: str):
    """Emit CloudWatch metric for gate outcome."""
    try:
        cloudwatch.put_metric_data(
            Namespace="AirlineVoiceAgent",
            MetricData=[
                {
                    "MetricName": "SpeechGateOutcome",
                    "Value": 1,
                    "Unit": "Count",
                    "Dimensions": [
                        {"Name": "Gate", "Value": str(gate)},
                        {"Name": "Result", "Value": result},
                        {"Name": "Environment", "Value": ENVIRONMENT},
                    ],
                }
            ],
        )
    except Exception as e:
        logger.warning(f"Failed to emit metric: {e}")


def handler(event, context):
    """Main handler — applies four gates sequentially."""
    start_time = time.time()

    contact_id = event.get("contactId", "unknown")
    transcript = event.get("transcript", "")
    words = event.get("words", [])

    logger.info(json.dumps({
        "action": "speech_quality_gate",
        "contactId": contact_id,
        "transcriptLength": len(transcript),
        "wordCount": len(words),
    }))

    # Gate 1: Minimum length
    if len(transcript.strip()) < MIN_LENGTH_THRESHOLD:
        emit_metric(1, "REJECT")
        return _reject(1, "MIN_LENGTH", transcript, start_time)

    # Gate 2: Confidence threshold
    if words:
        avg_confidence = sum(w.get("confidence", 0) for w in words) / len(words)
        if avg_confidence < CONFIDENCE_THRESHOLD:
            emit_metric(2, "REJECT")
            return _reject(2, "LOW_CONFIDENCE", transcript, start_time)

    # Gate 3: Entropy check
    entropy = shannon_entropy(transcript)
    if entropy < ENTROPY_THRESHOLD:
        emit_metric(3, "REJECT")
        return _reject(3, "LOW_ENTROPY", transcript, start_time)

    # Gate 4: Gibberish detection
    ratio = dictionary_match_ratio(transcript)
    if ratio < GIBBERISH_THRESHOLD:
        emit_metric(4, "REJECT")
        return _reject(4, "GIBBERISH", transcript, start_time)

    # All gates passed
    emit_metric(0, "PASS")
    processing_time = int((time.time() - start_time) * 1000)

    logger.info(json.dumps({
        "action": "speech_quality_gate_result",
        "contactId": contact_id,
        "result": "PASS",
        "processingTimeMs": processing_time,
    }))

    return {
        "result": "PASS",
        "reason": None,
        "transcript": transcript,
        "gate": None,
        "metrics": {"processingTimeMs": processing_time},
    }


def _reject(gate: int, reason: str, transcript: str, start_time: float) -> dict:
    """Build rejection response."""
    processing_time = int((time.time() - start_time) * 1000)

    logger.info(json.dumps({
        "action": "speech_quality_gate_result",
        "result": "REJECT",
        "reason": reason,
        "gate": gate,
        "processingTimeMs": processing_time,
    }))

    return {
        "result": "REJECT",
        "reason": reason,
        "transcript": transcript,
        "gate": gate,
        "metrics": {"processingTimeMs": processing_time},
    }
