// 全成分表示の文字を、比べられる成分の一覧に整理する。
// Python（analyzer/app/ingredients.py）と同じ規則で、contract/cases.json の同じテストを通す。
// 本番ではこの処理は Python 側が行い、ここはデモ（サーバーなし）で使う。
import aliasData from "../../../contract/ingredient-aliases.json" with { type: "json" };

const LABEL = /(有効成分|その他の成分|成分)\s*[:：]/g;
// 読点・カンマ・改行で区切る。ただし「1,3-BG」のように数字にはさまれたカンマは区切らない。
const SEPARATOR = /[、\n\r]+|(?<!\d),|,(?!\d)/;

const key = (name: string): string => name.normalize("NFKC").trim().toUpperCase();

const aliasTable: Map<string, string> = (() => {
  const table = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(aliasData.aliases as Record<string, string[]>)) {
    table.set(key(canonical), canonical);
    for (const alias of aliases) table.set(key(alias), canonical);
  }
  return table;
})();

export function normalize(text: string): string[] {
  const cleaned = text.normalize("NFKC").replace(LABEL, "\n");
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of cleaned.split(SEPARATOR)) {
    const name = raw.trim().replace(/[。.]+$/, "").trim();
    if (!name) continue;
    const canonical = aliasTable.get(key(name)) ?? name;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}
