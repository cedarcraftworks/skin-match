// 自分の記録をもとに、候補の成分を「共通点・注意点・どちらにも・情報なし」に分ける。
// Python（analyzer/app/judge.py）と同じ規則。本番では Python 側が判定し、ここはデモで使う。

export type Result = "good" | "bad";

export interface UsageResult {
  result: Result;
  ingredients: string[];
}

export interface Finding {
  ingredient: string;
  goodCount: number;
  badCount: number;
  reason: string;
}

export interface Judgement {
  goodTotal: number;
  badTotal: number;
  lowData: boolean;
  common: Finding[];
  caution: Finding[];
  mixed: Finding[];
  unknown: Finding[];
}

/** 合った物がこの数より少ないと、参考程度として扱う */
export const MIN_GOOD_RECORDS = 3;

export function judge(candidate: string[], records: UsageResult[]): Judgement {
  const good = records.filter((r) => r.result === "good").map((r) => new Set(r.ingredients));
  const bad = records.filter((r) => r.result === "bad").map((r) => new Set(r.ingredients));
  const gt = good.length;
  const bt = bad.length;
  const out: Judgement = {
    goodTotal: gt,
    badTotal: bt,
    lowData: gt < MIN_GOOD_RECORDS,
    common: [],
    caution: [],
    mixed: [],
    unknown: [],
  };

  const seen = new Set<string>();
  for (const name of candidate) {
    if (seen.has(name)) continue;
    seen.add(name);
    const g = good.filter((s) => s.has(name)).length;
    const b = bad.filter((s) => s.has(name)).length;

    if (g === 0 && b === 0) {
      out.unknown.push({ ingredient: name, goodCount: 0, badCount: 0, reason: "まだ試したことのない成分です" });
    } else if (gt > 0 && g * 2 >= gt) {
      out.common.push({ ingredient: name, goodCount: g, badCount: b, reason: `合った${gt}個中${g}個に入っていた成分です` });
    } else if (g === 0) {
      out.caution.push({
        ingredient: name,
        goodCount: g,
        badCount: b,
        reason: `合わなかった${bt}個中${b}個に入っていて、合った物には入っていませんでした`,
      });
    } else {
      out.mixed.push({
        ingredient: name,
        goodCount: g,
        badCount: b,
        reason: `合った${gt}個中${g}個、合わなかった${bt}個中${b}個に入っていました`,
      });
    }
  }
  return out;
}

/** 記録全体の傾向：記録に出てきたすべての成分を、自分の記録に照らして分ける。 */
export function insights(records: UsageResult[]): Judgement {
  return judge(
    records.flatMap((r) => r.ingredients),
    records,
  );
}
