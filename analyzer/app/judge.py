"""自分の記録をもとに、候補の成分を「共通点・注意点・どちらにも・情報なし」に分ける。

点数にまとめず、何個中何個に入っていたかという数えた事実をそのまま返す。
「合う」「原因」とは言わない（設計書「判定の仕組み」）。
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Result = Literal["good", "bad"]

# 合った物がこの数より少ないと、参考程度として扱う
MIN_GOOD_RECORDS = 3


@dataclass(frozen=True)
class Record:
    result: Result
    ingredients: list[str]


@dataclass
class Finding:
    ingredient: str
    goodCount: int
    badCount: int
    reason: str


@dataclass
class Judgement:
    goodTotal: int
    badTotal: int
    lowData: bool
    common: list[Finding] = field(default_factory=list)
    caution: list[Finding] = field(default_factory=list)
    mixed: list[Finding] = field(default_factory=list)
    unknown: list[Finding] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def judge(candidate: Iterable[str], records: Iterable[Record]) -> Judgement:
    records = list(records)
    good = [set(r.ingredients) for r in records if r.result == "good"]
    bad = [set(r.ingredients) for r in records if r.result == "bad"]
    gt, bt = len(good), len(bad)
    out = Judgement(goodTotal=gt, badTotal=bt, lowData=gt < MIN_GOOD_RECORDS)

    seen: set[str] = set()
    for name in candidate:
        if name in seen:
            continue
        seen.add(name)
        g = sum(name in s for s in good)
        b = sum(name in s for s in bad)

        if g == 0 and b == 0:
            out.unknown.append(Finding(name, 0, 0, "まだ試したことのない成分です"))
        elif gt > 0 and g * 2 >= gt:
            out.common.append(Finding(name, g, b, f"合った{gt}個中{g}個に入っていた成分です"))
        elif g == 0:
            out.caution.append(
                Finding(name, g, b, f"合わなかった{bt}個中{b}個に入っていて、合った物には入っていませんでした")
            )
        else:
            out.mixed.append(Finding(name, g, b, f"合った{gt}個中{g}個、合わなかった{bt}個中{b}個に入っていました"))
    return out


def insights(records: Iterable[Record]) -> Judgement:
    """記録全体の傾向：記録に出てきたすべての成分を、自分の記録に照らして分ける。"""
    records = list(records)
    every: list[str] = []
    for r in records:
        every.extend(r.ingredients)
    return judge(every, records)
