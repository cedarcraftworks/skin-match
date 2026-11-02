import { useCallback, useEffect, useMemo, useState } from "react";
import { InsightsView } from "./components/InsightsView.tsx";
import { JudgeView } from "./components/JudgeView.tsx";
import { LoginView } from "./components/LoginView.tsx";
import { RecordsView } from "./components/RecordsView.tsx";
import { type Api, ApiError, HttpApi, type Product } from "./lib/api.ts";
import { DemoApi } from "./lib/demo.ts";

declare const __DEMO__: boolean;
declare const __API_URL__: string;
declare const __REPO_URL__: string;

type Tab = "judge" | "records" | "insights";
const TABS: { id: Tab; label: string }[] = [
  { id: "judge", label: "判定" },
  { id: "records", label: "記録" },
  { id: "insights", label: "傾向" },
];

const TOKEN_KEY = "skin-match-token";
const storage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (v: string | null) => {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // 保存できない環境でも、このタブの間はログインしたまま使える
    }
  },
};

export function App() {
  const [token, setToken] = useState<string | null>(() => (__DEMO__ ? null : storage.get()));
  const http = useMemo(() => new HttpApi(__API_URL__, () => token), [token]);
  const api: Api = useMemo(() => (__DEMO__ ? new DemoApi() : http), [http]);
  const [tab, setTab] = useState<Tab>("judge");
  const [products, setProducts] = useState<Product[]>([]);

  const updateToken = useCallback((t: string | null) => {
    storage.set(t);
    setToken(t);
  }, []);

  const reload = useCallback(async () => {
    try {
      setProducts(await api.listProducts());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) updateToken(null);
    }
  }, [api, updateToken]);

  const loggedIn = __DEMO__ || token !== null;
  useEffect(() => {
    if (loggedIn) void reload();
  }, [loggedIn, reload]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden="true">◐</span>
          <div>
            <h1>肌に合う次の一本</h1>
            <p className="tagline">自分の記録から、次に試す化粧品の共通点と注意点を見つける</p>
          </div>
        </div>
        {!__DEMO__ && token && (
          <button
            type="button"
            className="link"
            onClick={async () => {
              await http.logout().catch(() => undefined);
              updateToken(null);
            }}
          >
            ログアウト
          </button>
        )}
      </header>

      {__DEMO__ && (
        <p className="demo-banner">
          架空の利用者の記録（合った4個・合わなかった2個）で動くデモです。登録不要で、入力した内容は再読み込みで元に戻ります。{" "}
          <a href={__REPO_URL__}>ソースコード</a>
        </p>
      )}

      {!loggedIn ? (
        <LoginView api={http} onToken={updateToken} />
      ) : (
        <>
          <nav className="tabs" aria-label="画面の切り替え">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "tab active" : "tab"}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <main>
            {tab === "judge" && <JudgeView api={api} />}
            {tab === "records" && <RecordsView api={api} products={products} reload={reload} />}
            {tab === "insights" && <InsightsView api={api} />}
          </main>
        </>
      )}
      {__DEMO__ && (
        <footer className="footer">
          <span>デモの化粧品名・ブランドはすべて架空です。</span>
        </footer>
      )}
    </div>
  );
}
