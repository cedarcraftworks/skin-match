"""判定サービス（Python / FastAPI）。Java の API からだけ呼ばれる、内部向けのサービス。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .ingredients import _DEFAULT_ALIASES, normalize
from .judge import Record, insights, judge

ALIASES_PATH = Path(os.environ.get("ALIASES_PATH", _DEFAULT_ALIASES))

app = FastAPI(title="skin-match analyzer", version="1.0.0")


class NormalizeRequest(BaseModel):
    text: str = Field(max_length=20_000)


class NormalizeResponse(BaseModel):
    ingredients: list[str]


class RecordIn(BaseModel):
    result: Literal["good", "bad"]
    ingredients: list[str]


class JudgeRequest(BaseModel):
    candidate: list[str]
    records: list[RecordIn]


class InsightsRequest(BaseModel):
    records: list[RecordIn]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/normalize", response_model=NormalizeResponse)
def post_normalize(req: NormalizeRequest) -> NormalizeResponse:
    return NormalizeResponse(ingredients=normalize(req.text, ALIASES_PATH))


@app.post("/judge")
def post_judge(req: JudgeRequest) -> dict[str, Any]:
    records = [Record(r.result, r.ingredients) for r in req.records]
    return judge(req.candidate, records).to_dict()


@app.post("/insights")
def post_insights(req: InsightsRequest) -> dict[str, Any]:
    records = [Record(r.result, r.ingredients) for r in req.records]
    return insights(records).to_dict()
