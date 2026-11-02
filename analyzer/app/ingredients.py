"""全成分表示の文字を、比べられる成分の一覧に整理する。"""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

# contract/ はリポジトリの直下にある。Docker では ALIASES_PATH で場所を渡す。
_DEFAULT_ALIASES = Path(__file__).resolve().parents[2] / "contract" / "ingredient-aliases.json"

# 医薬部外品の表示で使われる見出し（「有効成分：」「その他の成分：」）
_LABEL = re.compile(r"(有効成分|その他の成分|成分)\s*[:：]")
# 区切り：読点、カンマ、改行（NFKC のあとなので全角カンマは半角になっている）。
# ただし「1,3-BG」のように数字にはさまれたカンマは成分名の一部なので区切らない。
_SEPARATOR = re.compile(r"[、\n\r]+|(?<!\d),|,(?!\d)")


def _key(name: str) -> str:
    """比べるためのキー。全角半角をそろえ、英字の大文字小文字を無視する。"""
    return unicodedata.normalize("NFKC", name).strip().upper()


@lru_cache(maxsize=1)
def _alias_table(path: str) -> dict[str, str]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    table: dict[str, str] = {}
    for canonical, aliases in data["aliases"].items():
        table[_key(canonical)] = canonical
        for alias in aliases:
            table[_key(alias)] = canonical
    return table


def normalize(text: str, aliases_path: Path | str = _DEFAULT_ALIASES) -> list[str]:
    """成分表示の文字を、統一した成分名の一覧（表示順・重複なし）にする。"""
    table = _alias_table(str(aliases_path))
    cleaned = unicodedata.normalize("NFKC", text)
    # 見出しは区切りとして扱う（「有効成分：A その他の成分：B」→ A と B）
    cleaned = _LABEL.sub("\n", cleaned)

    result: list[str] = []
    seen: set[str] = set()
    for raw in _SEPARATOR.split(cleaned):
        name = raw.strip().rstrip("。.").strip()
        if not name:
            continue
        canonical = table.get(_key(name), name)
        if canonical not in seen:
            seen.add(canonical)
            result.append(canonical)
    return result
