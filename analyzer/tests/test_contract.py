"""contract/cases.json の共通ケース。TypeScript 側（web）も同じファイルで確かめる。"""

import json
from pathlib import Path

import pytest

from app.ingredients import normalize
from app.judge import Record, judge

CASES = json.loads((Path(__file__).resolve().parents[2] / "contract" / "cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES["normalize"], ids=lambda c: c["name"])
def test_normalize(case):
    assert normalize(case["input"]) == case["expected"]


@pytest.mark.parametrize("case", CASES["judge"], ids=lambda c: c["name"])
def test_judge(case):
    records = [Record(r["result"], r["ingredients"]) for r in case["records"]]
    assert judge(case["candidate"], records).to_dict() == case["expected"]
