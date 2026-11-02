import type { Finding, Judgement } from "../lib/judge.ts";

const SECTIONS = [
  { key: "common", title: "共通点", hint: "合った物の半分以上に入っていた成分", tone: "good" },
  { key: "caution", title: "注意点", hint: "合わなかった物にだけ入っていた成分", tone: "bad" },
  { key: "mixed", title: "どちらにも", hint: "合った物の一部、または両方に入っていた成分", tone: "neutral" },
  { key: "unknown", title: "情報なし", hint: "まだ試したことのない成分", tone: "neutral" },
] as const;

export function FindingList({ judgement, emptyText }: { judgement: Judgement; emptyText?: string }) {
  const total = SECTIONS.reduce((n, s) => n + judgement[s.key].length, 0);
  if (total === 0) return <p className="muted">{emptyText ?? "表示できる成分がありません"}</p>;

  return (
    <div className="findings">
      {SECTIONS.map((s) => {
        const items: Finding[] = judgement[s.key];
        if (items.length === 0) return null;
        return (
          <section key={s.key} className={`finding-group tone-${s.tone}`} aria-label={s.title}>
            <h3>
              {s.title} <span className="count">{items.length}</span>
            </h3>
            <p className="hint">{s.hint}</p>
            <ul>
              {items.map((f) => (
                <li key={f.ingredient}>
                  <span className="ingredient">{f.ingredient}</span>
                  <span className="reason">{f.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="disclaimer" role="note">
      これは自分の記録から見た傾向で、肌に合うことを保証するものではありません。肌に症状がある場合は、皮膚科を受診してください。
    </p>
  );
}
