"""Placeholder orchestrator service — health-check endpoint only."""

import os
from fastapi import FastAPI

app = FastAPI(title="Voice Agent Orchestrator", version="0.1.0")

ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")


@app.get("/health")
async def health():
    return {"status": "healthy", "environment": ENVIRONMENT}


@app.get("/")
async def root():
    return {"service": "voice-agent-orchestrator", "version": "0.1.0"}
