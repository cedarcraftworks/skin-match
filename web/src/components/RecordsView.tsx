import { useState } from "react";
import { type Api, CATEGORY_LABEL, type Category, type Product } from "../lib/api.ts";
import type { Result } from "../lib/judge.ts";

const today = () => new Date().toISOString().slice(0, 10);

export function RecordsView({
  api,
  products,
  reload,
}: {
  api: Api;
  products: Product[];
  reload: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした");
    }
  }

  return (
    <div className="stack">
      <NewProductForm onSubmit={(p) => act(() => api.createProduct(p))} />
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>記録した化粧品 {products.length} 個</h2>
        {products.length === 0 && <p className="muted">まだ記録がありません。上のフォームから登録してください。</p>}
        <ul className="products">
          {products.map((p) => (
            <ProductItem
              key={p.id}
              product={p}
              onResult={(result) => act(() => api.addUsage(p.id, { startedOn: today(), result }))}
              onDelete={() => act(() => api.deleteProduct(p.id))}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function NewProductForm({
  onSubmit,
}: {
  onSubmit: (p: { name: string; brand: string; category: Category; ingredientsText: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<Category>("toner");
  const [ingredientsText, setIngredientsText] = useState("");

  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ name, brand, category, ingredientsText });
        setName("");
        setBrand("");
        setIngredientsText("");
      }}
    >
      <h2>使った化粧品を登録する</h2>
      <div className="row">
        <label className="field">
          <span>商品名</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </label>
        <label className="field">
          <span>ブランド（任意）</span>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={200} />
        </label>
        <label className="field">
          <span>種類</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>全成分表示</span>
        <textarea
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          rows={3}
          required
          placeholder="パッケージや公式サイトの全成分表示を貼り付け"
        />
      </label>
      <button type="submit" className="primary">
        登録する
      </button>
    </form>
  );
}

const RESULT_LABEL: Record<Result, string> = { good: "合った", bad: "合わなかった" };

function ProductItem({
  product: p,
  onResult,
  onDelete,
}: {
  product: Product;
  onResult: (r: Result) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const latest = p.usages[0];
  return (
    <li className="product">
      <div className="product-head">
        <div>
          <span className="category">{CATEGORY_LABEL[p.category]}</span>
          <strong>{p.name}</strong>
          {p.brand && <span className="muted"> ／ {p.brand}</span>}
        </div>
        {p.latestResult ? (
          <span className={`badge badge-${p.latestResult}`}>{RESULT_LABEL[p.latestResult]}</span>
        ) : (
          <span className="badge">未判断</span>
        )}
      </div>
      {latest && (
        <p className="muted small">
          {latest.startedOn} から使用{latest.endedOn ? `（${latest.endedOn} まで）` : ""}
          {latest.memo ? `：${latest.memo}` : ""}
        </p>
      )}
      <div className="actions">
        <span className="small muted">肌に</span>
        <button type="button" className="ghost good" onClick={() => onResult("good")}>
          合った
        </button>
        <button type="button" className="ghost bad" onClick={() => onResult("bad")}>
          合わなかった
        </button>
        <button type="button" className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
          成分 {p.ingredients.length} 個を{open ? "閉じる" : "見る"}
        </button>
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (window.confirm(`「${p.name}」の記録を削除しますか？`)) onDelete();
          }}
        >
          削除
        </button>
      </div>
      {open && <p className="ingredients small">{p.ingredients.join("、")}</p>}
    </li>
  );
}
