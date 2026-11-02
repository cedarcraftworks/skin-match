import { useEffect, useState } from "react";
import type { Api } from "../lib/api.ts";
import type { Judgement } from "../lib/judge.ts";
import { Disclaimer, FindingList } from "./FindingList.tsx";

// 「傾向」タブを開くたびに作り直されるので、そのたびに最新の記録で集計し直す
export function InsightsView({ api }: { api: Api }) {
  const [data, setData] = useState<Judgement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.insights().then(setData, (e) => setError(e instanceof Error ? e.message : "読み込めませんでした"));
  }, [api]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">読み込み中…</p>;

  // 傾向では「共通点」と「注意点」だけを見せる（全成分を並べると多すぎるため）
  const focused: Judgement = { ...data, mixed: [], unknown: [] };
  return (
    <section className="card">
      <h2>自分の肌の傾向</h2>
      <p className="summary">
        合った {data.goodTotal} 個・合わなかった {data.badTotal} 個の記録から、共通する成分をまとめました。
      </p>
      {data.lowData && <p className="warning">合った物の記録がまだ3個未満のため、参考程度に見てください。</p>}
      <FindingList judgement={focused} emptyText="「合った／合わなかった」を記録すると、ここに傾向が表示されます。" />
      <Disclaimer />
    </section>
  );
}
