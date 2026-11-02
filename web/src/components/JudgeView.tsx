import { useState } from "react";
import type { Api, JudgeResponse } from "../lib/api.ts";
import { DEMO_CANDIDATES } from "../lib/demo.ts";
import { Disclaimer, FindingList } from "./FindingList.tsx";

export function JudgeView({ api }: { api: Api }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<JudgeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(input = text) {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.judge(input));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "判定できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>次に試す候補を判定する</h2>
        <p className="muted">
          気になる化粧品の全成分表示を、公式サイトなどからコピーして貼り付けてください。自分の記録と照らし合わせて、共通点と注意点を出します。
        </p>
        <label className="field">
          <span>全成分表示</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="例：水、グリセリン、BG、セラミドNP、フェノキシエタノール"
          />
        </label>
        {api.demo && (
          <div className="examples">
            {DEMO_CANDIDATES.map((c) => (
              <button
                key={c.label}
                type="button"
                className="chip"
                onClick={() => {
                  setText(c.text);
                  void run(c.text);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="primary" disabled={busy || !text.trim()} onClick={() => void run()}>
          {busy ? "判定中…" : "判定する"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <section className="card" aria-live="polite">
          <h2>判定結果</h2>
          <p className="summary">
            読み取った成分 {result.candidate.length} 個を、合った {result.judgement.goodTotal} 個・合わなかった{" "}
            {result.judgement.badTotal} 個の記録と比べました。
          </p>
          {result.judgement.lowData && (
            <p className="warning">合った物の記録がまだ3個未満のため、参考程度に見てください。</p>
          )}
          <FindingList judgement={result.judgement} />
          <Disclaimer />
        </section>
      )}
    </div>
  );
}
